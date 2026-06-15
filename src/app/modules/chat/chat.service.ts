import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../error/appError';
import { getPublicFileUrl } from '../../helper/multer-s3-uploader';
import { Conversation, Message } from './chat.model';

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
  const conversations = await Conversation.find({
    participants: userId,
  })
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
    .sort({ updatedAt: -1 });

  return conversations.map((conversation) => normalizeConversationUrls(conversation));
};

const getMessageHistory = async (userId: string, conversationId: string) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
  }

  if (!conversation.participants.some((p) => p.toString() === userId)) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not a participant in this conversation');
  }

  await Message.updateMany(
    {
      conversation: conversation._id,
      receiver: new Types.ObjectId(userId),
      status: 'sent',
    },
    { status: 'delivered' }
  );

  const messages = await Message.find({
    conversation: conversationId,
  })
    .populate({
      path: 'sender',
      select: 'fullName email profileImage',
    })
    .populate({
      path: 'receiver',
      select: 'fullName email profileImage',
    })
    .populate('asset')
    .sort({ createdAt: 1 });

  return messages.map((message) => normalizeMessageUrls(message));
};

const createConversation = async (userId: string, partnerId: string) => {
  if (userId === partnerId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot create a conversation with yourself');
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [userId, partnerId] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId, partnerId],
    });
  }

  return conversation;
};

export const ChatServices = {
  getMyConversations,
  getMessageHistory,
  createConversation,
};
