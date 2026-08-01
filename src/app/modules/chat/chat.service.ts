import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../error/appError';
import { getPublicFileUrl } from '../../helper/multer-s3-uploader';
import { Conversation, Message } from './chat.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { getIO } from '../../socket/socket';
import User from '../user/user-model';
import { assertUsersCanInteract } from '../user/user-block.utils';

type TPlainObject = Record<string, unknown>;

const toPlainObject = (value: unknown): TPlainObject => {
  if (value && typeof value === 'object' && 'toObject' in value) {
    return (value as { toObject: () => TPlainObject }).toObject();
  }

  return value as TPlainObject;
};

const normalizeAssetUrl = (asset: unknown) => {
  if (!asset || typeof asset !== 'object') {
    return asset;
  }

  const assetObj = toPlainObject(asset);
  if (typeof assetObj.url === 'string') {
    assetObj.url = getPublicFileUrl(assetObj.url) || assetObj.url;
  }

  return assetObj;
};

const normalizeMessageUrls = (message: unknown) => {
  if (!message || typeof message !== 'object') {
    return message;
  }

  const messageObj = toPlainObject(message);
  if (typeof messageObj.file === 'string') {
    messageObj.file = getPublicFileUrl(messageObj.file) || messageObj.file;
  }

  if (messageObj.asset) {
    messageObj.asset = normalizeAssetUrl(messageObj.asset);
  }

  return messageObj;
};

const normalizeConversationUrls = (conversation: unknown) => {
  const conversationObj = toPlainObject(conversation);
  if (conversationObj.lastMessage) {
    conversationObj.lastMessage = normalizeMessageUrls(conversationObj.lastMessage);
  }

  return conversationObj;
};

const getMyConversations = async (userId: string) => {
  const [conversations, currentUser] = await Promise.all([
    Conversation.find({ participants: userId })
    .populate({
      path: 'participants',
      select: 'fullName email profileImage profession licenseNo governingBody phone bio country city location isPremium',
    })
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'asset',
      },
    })
      .sort({ updatedAt: -1 }),
    User.findById(userId).select('+blockedUsers').lean(),
  ]);

  const blockedUserIds = new Set(
    (currentUser?.blockedUsers || []).map((blockedUserId) => blockedUserId.toString())
  );

  return conversations.map((conversation) => {
    const conversationObj = normalizeConversationUrls(conversation);
    const participants = Array.isArray(conversationObj.participants)
      ? conversationObj.participants
      : [];
    const receiver = participants.find((participant) => {
      const participantObj = toPlainObject(participant);
      return String(participantObj._id) !== userId;
    });
    conversationObj.receiver = receiver
      ? {
          ...toPlainObject(receiver),
          isBlocked: blockedUserIds.has(String(toPlainObject(receiver)._id)),
        }
      : null;

    return conversationObj;
  });
};

const getMessageHistory = async (
  userId: string,
  conversationId: string,
  options?: Record<string, unknown>
) => {
  console.log("options in service", options);
  const conversation = await Conversation.findById(conversationId).populate({
    path: 'participants',
    select: 'fullName profileImage',
  });

  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some((p: any) => p._id.toString() === userId);

  if (!isParticipant) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not a participant in this conversation');
  }

  const receiverDoc: any = conversation.participants.find((p: any) => p._id.toString() !== userId);
  const currentUser = await User.findById(userId).select('+blockedUsers').lean();
  const receiverIsBlocked = receiverDoc
    ? (currentUser?.blockedUsers || []).some(
        (blockedUserId) => blockedUserId.toString() === receiverDoc._id.toString()
      )
    : false;
  let isOnline = false;

  if (receiverDoc) {
    try {
      const io = getIO();
      const receiverSockets = await io.in(receiverDoc._id.toString()).fetchSockets();
      isOnline = receiverSockets.length > 0;
    } catch {
      // socket not initialised
    }
  }

  const receiverInfo = receiverDoc ? {
    id: receiverDoc._id,
    fullName: receiverDoc.fullName,
    profileImage: receiverDoc.profileImage,
    isOnline,
    isBlocked: receiverIsBlocked,
  } : null;

  await Message.updateMany(
    {
      conversation: conversation._id,
      receiver: new Types.ObjectId(userId),
      status: 'sent',
    },
    { status: 'delivered' }
  );

  // Use QueryBuilder for consistent query handling
  const baseQuery = Message.find({ conversation: conversationId })
    .populate({ path: 'sender', select: 'fullName email profileImage' })
    .populate({ path: 'receiver', select: 'fullName email profileImage' })
    .populate('asset');

  // Set default sort if not provided in options
  const queryOptions = {
    ...options,
    sort: options?.sort || '-createdAt', // Default: newest first
    page: (options && typeof (options as any).page !== 'undefined') ? (options as any).page : 1,
    limit: (options && typeof (options as any).limit !== 'undefined') ? (options as any).limit : 20,
  };

  const qb = new QueryBuilder(baseQuery, queryOptions)
    .fields()
    .filter()
    .sort()
    .paginate();

  const messages = await qb.modelQuery.exec();

  const pagination = options && (options.page !== undefined || options.limit !== undefined)
    ? await qb.countTotal()
    : null;

  const showTheReceiverIdOutOfDataArray = messages.some((msg) => {
    try {
      return msg.receiver && msg.receiver.toString && msg.receiver.toString() === userId;
    } catch (e) {
      return false;
    }
  });

  if (!showTheReceiverIdOutOfDataArray) {
    const otherParticipant = conversation.participants.find((p: any) => p._id.toString() !== userId) as any;
    if (otherParticipant) {
      if (!receiverInfo) {
        (receiverInfo as any) = {
          fullName: otherParticipant.fullName,
          profileImage: otherParticipant.profileImage,
          id: otherParticipant._id,
          isOnline: false,
          isBlocked: receiverIsBlocked,
        };
      } else {
        (receiverInfo as any).fullName = otherParticipant.fullName;
        (receiverInfo as any).profileImage = otherParticipant.profileImage;
        (receiverInfo as any).id = otherParticipant._id;
        (receiverInfo as any).isOnline = false;
      }
    }
  }

  return {
    messages: messages.map((message) => normalizeMessageUrls(message)),
    receiver: receiverInfo,
    pagination,
  };
};

const createConversation = async (userId: string, partnerId: string) => {
  if (userId === partnerId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot create a conversation with yourself');
  }

  await assertUsersCanInteract(userId, partnerId);

  let conversation = await Conversation.findOne({
    participants: { $all: [userId, partnerId] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId, partnerId],
    });
  }

  await conversation.populate({
    path: 'participants',
    select: '_id fullName',
  });

  return conversation;
};

export const ChatServices = {
  getMyConversations,
  getMessageHistory,
  createConversation,
};
