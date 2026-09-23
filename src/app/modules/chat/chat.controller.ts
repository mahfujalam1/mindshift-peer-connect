import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../error/appError';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { ChatServices } from './chat.service';
import { getUploadedFileKey, getUploadedFileUrl } from '../../helper/multer-s3-uploader';
import { Conversation, Message } from './chat.model';
import { ChatAsset } from '../chat-asset/chat-asset.model';
import { emitConversations, getIO } from '../../socket/socket';
import User from '../user/user-model';
import { sendSinglePushNotification } from '../../helper/sendPushNotification';
import { assertUsersCanInteract } from '../user/user-block.utils';

type TChatFiles = {
  chat_file?: Express.Multer.File[];
  file?: Express.Multer.File[];
};

const getMyConversations = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await ChatServices.getMyConversations(userId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conversations retrieved successfully',
    data: result,
  });
});

const getMessageHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  // Extract pagination options from query parameters (page, limit, sort)
  const { page, limit, sort } = req.query as Record<string, any>;
  const options: Record<string, unknown> = {};
  if (page !== undefined) options.page = Number(page);
  if (limit !== undefined) options.limit = Number(limit);
  if (sort !== undefined) options.sort = sort;

  const opts = Object.keys(options).length ? options : {};
  const { messages, receiver, pagination } = await ChatServices.getMessageHistory(
    userId,
    conversationId,
    opts
  );

  res.status(httpStatus.OK).json({
    success: true,
    statusCode: httpStatus.OK,
    message: 'Message history retrieved successfully',
    data: messages,
    receiver,
    pagination,
  });
});

const createConversation = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { partnerId } = req.body;
  const result = await ChatServices.createConversation(userId, partnerId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Conversation created successfully',
    data: result,
  });
});

const uploadChatFile = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const files = req.files as TChatFiles | undefined;
  const uploadedFile = files?.chat_file?.[0] || files?.file?.[0];

  const { conversationId, assetUrl, text, replyTo } = req.body as {
    conversationId?: string;
    assetUrl?: string;
    text?: string;
    replyTo?: string;
  };

  if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Valid conversationId is required');
  }

  const fileUrl = getUploadedFileUrl(uploadedFile) || null;
  const fileKey = getUploadedFileKey(uploadedFile) || null;

  if (!fileUrl && !assetUrl) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Provide at least one of: file upload or assetUrl');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId
  );
  if (!isParticipant) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not a participant in this conversation');
  }

  const receiverId = conversation.participants.find(
    (p) => p.toString() !== userId
  );
  if (!receiverId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Receiver not found in conversation');
  }

  await assertUsersCanInteract(userId, receiverId.toString());

  let assetDoc = null;
  if (assetUrl) {
    assetDoc = await ChatAsset.findOne({ url: assetUrl, isActive: true });
  }

  const replyFields = await ChatServices.resolveReplyFields(
    conversationId,
    replyTo || null
  );

  let io;
  let isReceiverOnline = false;
  try {
    io = getIO();
    const receiverSockets = await io.in(receiverId.toString()).fetchSockets();
    isReceiverOnline = receiverSockets.length > 0;
  } catch {
    // socket not initialised — treat as offline
  }

  const status = isReceiverOnline ? 'delivered' : 'sent';
  const messageFile = fileKey || (!assetDoc && assetUrl ? assetUrl : null);

  const message = await Message.create({
    conversation: new Types.ObjectId(conversationId),
    sender: new Types.ObjectId(userId),
    receiver: receiverId,
    text: text?.trim() || '',
    file: messageFile,
    asset: assetDoc?._id || null,
    status,
    replyTo: replyFields.replyTo,
    replyToSnapshot: replyFields.replyToSnapshot,
  });

  await Conversation.findByIdAndUpdate(
    conversationId,
    { lastMessage: message._id },
    { new: true }
  );

  const messageObj = await ChatServices.populateMessage(String(message._id));
  const enriched = ChatServices.withReactionSummary(messageObj);

  if (io) {
    if (isReceiverOnline) {
      io.to(receiverId.toString()).emit('new_message', enriched);
    } else {
      try {
        const sender = await User.findById(userId).select('fullName');
        await sendSinglePushNotification(
          receiverId.toString(),
          sender?.fullName || 'New message',
          text?.trim() || (assetDoc ? 'Sent you a chat asset' : 'Sent you a file'),
          {
            type: 'message',
            conversationId,
            messageId: String(message._id),
            senderId: userId,
          }
        );
      } catch {
        // push notification failure should not block response
      }
    }
    io.to(userId).emit('message_sent', enriched);
    await Promise.all([
      emitConversations(userId),
      emitConversations(receiverId.toString()),
    ]);
  }

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Message sent with file successfully',
    data: {
      message: enriched,
      ...(fileUrl
        ? {
            uploadedFile: {
              url: fileUrl,
              key: fileKey,
              originalName: uploadedFile?.originalname,
              mimetype: uploadedFile?.mimetype,
              size: uploadedFile?.size,
            },
          }
        : {}),
    },
  });
});

const updateMessage = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;
  const { text } = req.body;

  const result = await ChatServices.updateMessage(userId, messageId, text);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message updated successfully',
    data: result,
  });
});

const reactToMessage = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;
  const { emoji } = req.body;

  const result = await ChatServices.reactToMessage(userId, messageId, emoji);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Reaction ${result.action} successfully`,
    data: result,
  });
});

const getMessagesAround = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { conversationId, messageId } = req.params;
  const { before, after } = req.query as { before?: string; after?: string };

  const result = await ChatServices.getMessagesAround(
    userId,
    conversationId,
    messageId,
    {
      before: before ? Number(before) : undefined,
      after: after ? Number(after) : undefined,
    }
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages around target retrieved successfully',
    data: result,
  });
});

const getChatSettings = catchAsync(async (_req, res) => {
  const result = await ChatServices.getChatSettings();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Chat settings retrieved successfully',
    data: result,
  });
});

const updateChatSetting = catchAsync(async (req, res) => {
  const { feature, status } = req.body;
  const result = await ChatServices.updateChatSetting(feature, status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Chat ${feature} setting updated successfully`,
    data: result,
  });
});

export const ChatControllers = {
  getMyConversations,
  getMessageHistory,
  getMessagesAround,
  createConversation,
  uploadChatFile,
  updateMessage,
  reactToMessage,
  getChatSettings,
  updateChatSetting,
};
