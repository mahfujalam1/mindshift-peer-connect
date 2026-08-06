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
  const result = await ChatServices.getMyConversations(userId);

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

  // conversationId is required — sent as form-data field or body field
  const { conversationId, assetUrl, text } = req.body as {
    conversationId?: string;
    assetUrl?: string;
    text?: string;
  };

  if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Valid conversationId is required');
  }

  // At least one of: file upload OR assetUrl must be provided
  const fileUrl = getUploadedFileUrl(uploadedFile) || null;
  const fileKey = getUploadedFileKey(uploadedFile) || null;

  if (!fileUrl && !assetUrl) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Provide at least one of: file upload or assetUrl');
  }

  // Validate conversation & membership
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

  // Resolve assetUrl to a ChatAsset document if provided
  let assetDoc = null;
  if (assetUrl) {
    assetDoc = await ChatAsset.findOne({ url: assetUrl, isActive: true });
    // If no exact match by url, treat assetUrl as a raw url stored directly in message.file
  }

  // Check if receiver is online
  let io;
  let isReceiverOnline = false;
  try {
    io = getIO();
    // We check by emitting to room — if the room has sockets, user is online
    const receiverSockets = await io.in(receiverId.toString()).fetchSockets();
    isReceiverOnline = receiverSockets.length > 0;
  } catch {
    // socket not initialised — treat as offline
  }

  const status = isReceiverOnline ? 'delivered' : 'sent';

  // Build message payload
  // file field: uploaded file url (S3 key or full url) OR fallback assetUrl if no ChatAsset doc found
  const messageFile = fileKey || (!assetDoc && assetUrl ? assetUrl : null);

  const message = await Message.create({
    conversation: new Types.ObjectId(conversationId),
    sender: new Types.ObjectId(userId),
    receiver: receiverId,
    text: text?.trim() || '',
    file: messageFile,
    asset: assetDoc?._id || null,
    status,
  });

  await Conversation.findByIdAndUpdate(
    conversationId,
    { lastMessage: message._id },
    { new: true }
  );

  const populatedMessage = await message.populate([
    { path: 'sender', select: 'fullName email profileImage' },
    { path: 'receiver', select: 'fullName email profileImage' },
    { path: 'asset' },
  ]);

  // Build response with resolved public URLs
  const messageObj = (populatedMessage as any).toObject();
  if (typeof messageObj.file === 'string') {
    const { getPublicFileUrl } = await import('../../helper/multer-s3-uploader');
    messageObj.file = getPublicFileUrl(messageObj.file) || messageObj.file;
  }

  // Emit via socket
  if (io) {
    if (isReceiverOnline) {
      io.to(receiverId.toString()).emit('new_message', messageObj);
    } else {
      // Offline push notification
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
    // Confirm to sender
    io.to(userId).emit('message_sent', messageObj);
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
      message: messageObj,
      ...(fileUrl ? { uploadedFile: { url: fileUrl, key: fileKey, originalName: uploadedFile?.originalname, mimetype: uploadedFile?.mimetype, size: uploadedFile?.size } } : {}),
    },
  });
});

export const ChatControllers = {
  getMyConversations,
  getMessageHistory,
  createConversation,
  uploadChatFile,
};
