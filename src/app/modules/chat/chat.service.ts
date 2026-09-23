import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../error/appError';
import { getPublicFileUrl } from '../../helper/multer-s3-uploader';
import { Conversation, Message } from './chat.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { getIO, emitConversations } from '../../socket/socket';
import User from '../user/user-model';
import { assertUsersCanInteract } from '../user/user-block.utils';
import {
  ALLOWED_MESSAGE_EMOJIS,
  isAllowedMessageEmoji,
  MESSAGE_POPULATE,
} from './chat.constants';
import { TReplyToSnapshot } from './chat.interface';
import ChatSetting from './chat-setting.model';
import { TChatFeature } from './chat-setting.interface';

type TPlainObject = Record<string, unknown>;

const defaultChatSettings = [
  { feature: 'reply' as const, status: true },
  { feature: 'reaction' as const, status: true },
];

const getChatSettings = async () => {
  const savedSettings = await ChatSetting.find({}).lean();
  const settings = defaultChatSettings.map(
    (defaultSetting) =>
      savedSettings.find((item) => item.feature === defaultSetting.feature) ||
      defaultSetting
  );

  return {
    reply: settings.find((item) => item.feature === 'reply')!.status,
    reaction: settings.find((item) => item.feature === 'reaction')!.status,
  };
};

const updateChatSetting = async (feature: TChatFeature, status: boolean) => {
  await ChatSetting.findOneAndUpdate(
    { feature },
    { $set: { status } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return getChatSettings();
};

const assertChatFeatureEnabled = async (feature: TChatFeature) => {
  const settings = await getChatSettings();
  if (!settings[feature]) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Message ${feature} is currently disabled`
    );
  }
};

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

  if (messageObj.replyToSnapshot && typeof messageObj.replyToSnapshot === 'object') {
    const snapshot = toPlainObject(messageObj.replyToSnapshot);
    if (typeof snapshot.file === 'string') {
      snapshot.file = getPublicFileUrl(snapshot.file) || snapshot.file;
      messageObj.replyToSnapshot = snapshot;
    }
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

const populateMessage = async (messageId: Types.ObjectId | string) => {
  const populated = await Message.findById(messageId).populate([
    ...MESSAGE_POPULATE,
  ]);

  return normalizeMessageUrls(populated);
};

const assertConversationParticipant = async (
  userId: string,
  conversationId: string
) => {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid conversation id');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (participant) => participant.toString() === userId
  );

  if (!isParticipant) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not a participant in this conversation'
    );
  }

  return conversation;
};

const buildReplySnapshot = async (
  replyToId: string,
  conversationId: string
): Promise<{ replyTo: Types.ObjectId; replyToSnapshot: TReplyToSnapshot }> => {
  if (!Types.ObjectId.isValid(replyToId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid replyTo message id');
  }

  const repliedMessage = await Message.findById(replyToId)
    .populate({ path: 'sender', select: 'fullName' })
    .lean();

  if (!repliedMessage) {
    throw new AppError(httpStatus.NOT_FOUND, 'Replied message not found');
  }

  if (String(repliedMessage.conversation) !== String(conversationId)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You can only reply to a message in the same conversation'
    );
  }

  const sender = repliedMessage.sender as unknown as {
    _id: Types.ObjectId;
    fullName?: string;
  };

  return {
    replyTo: new Types.ObjectId(String(repliedMessage._id)),
    replyToSnapshot: {
      _id: new Types.ObjectId(String(repliedMessage._id)),
      text: repliedMessage.text || '',
      file: repliedMessage.file || null,
      senderName: sender?.fullName || 'Unknown',
      senderId: sender?._id || new Types.ObjectId(String(repliedMessage.sender)),
    },
  };
};

const getReactionSummary = (
  reactions: Array<{ emoji: string; user: unknown }> = []
) => {
  const summary: Record<string, number> = {};
  for (const reaction of reactions) {
    summary[reaction.emoji] = (summary[reaction.emoji] || 0) + 1;
  }
  return summary;
};

const withReactionSummary = (message: unknown) => {
  const messageObj = normalizeMessageUrls(message) as TPlainObject;
  const reactions = Array.isArray(messageObj.reactions)
    ? (messageObj.reactions as Array<{ emoji: string; user: unknown }>)
    : [];

  return {
    ...messageObj,
    reactionSummary: getReactionSummary(reactions),
  };
};

const emitMessageToParticipants = async (
  event: string,
  payload: unknown,
  senderId: string,
  receiverId: string
) => {
  try {
    const io = getIO();
    io.to(receiverId).emit(event, payload);
    io.to(senderId).emit(event, payload);
  } catch (error) {
    console.error(`Failed to emit ${event}:`, error);
  }
};

const getMyConversations = async (
  userId: string,
  query: Record<string, unknown> = {}
) => {
  const searchTerm = (query.searchTerm || query.search) as string | undefined;

  let conversationFilter: Record<string, unknown> = {
    participants: userId,
  };

  if (searchTerm && String(searchTerm).trim()) {
    const matchedUsersQuery = new QueryBuilder(
      User.find({
        _id: { $ne: new Types.ObjectId(userId) },
        isDeleted: false,
      }),
      { searchTerm: String(searchTerm).trim() }
    ).search(['fullName', 'email']);

    const matchedUsers = await matchedUsersQuery.modelQuery.select('_id').lean();

    if (!matchedUsers.length) {
      return [];
    }

    conversationFilter = {
      $and: [
        { participants: userId },
        { participants: { $in: matchedUsers.map((user) => user._id) } },
      ],
    };
  }

  const conversationQuery = new QueryBuilder(
    Conversation.find(conversationFilter)
      .populate({
        path: 'participants',
        select:
          'fullName email profileImage profession licenseNo governingBody phone bio country city location isPremium',
      })
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'asset',
        },
      }),
    {
      sort: query.sort || '-updatedAt',
      ...(query.page !== undefined ? { page: query.page } : {}),
      ...(query.limit !== undefined ? { limit: query.limit } : {}),
      ...(query.fields ? { fields: query.fields } : {}),
    }
  ).sort();

  if (query.page !== undefined || query.limit !== undefined) {
    conversationQuery.paginate();
  }

  if (query.fields) {
    conversationQuery.fields();
  }

  const [conversations, currentUser] = await Promise.all([
    conversationQuery.modelQuery,
    User.findById(userId).select('+blockedUsers').lean(),
  ]);

  const blockedUserIds = new Set(
    (currentUser?.blockedUsers || []).map((blockedUserId) =>
      blockedUserId.toString()
    )
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
  const conversation = await Conversation.findById(conversationId).populate({
    path: 'participants',
    select: 'fullName profileImage',
  });

  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p: any) => p._id.toString() === userId
  );

  if (!isParticipant) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not a participant in this conversation'
    );
  }

  const receiverDoc: any = conversation.participants.find(
    (p: any) => p._id.toString() !== userId
  );
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
      const receiverSockets = await io
        .in(receiverDoc._id.toString())
        .fetchSockets();
      isOnline = receiverSockets.length > 0;
    } catch {
      // socket not initialised
    }
  }

  const receiverInfo = receiverDoc
    ? {
        id: receiverDoc._id,
        fullName: receiverDoc.fullName,
        profileImage: receiverDoc.profileImage,
        isOnline,
        isBlocked: receiverIsBlocked,
      }
    : null;

  await Message.updateMany(
    {
      conversation: conversation._id,
      receiver: new Types.ObjectId(userId),
      status: 'sent',
    },
    { status: 'delivered' }
  );

  const baseQuery = Message.find({ conversation: conversationId })
    .populate([...MESSAGE_POPULATE]);

  const queryOptions = {
    ...options,
    sort: options?.sort || '-createdAt',
    page:
      options && typeof (options as any).page !== 'undefined'
        ? (options as any).page
        : 1,
    limit:
      options && typeof (options as any).limit !== 'undefined'
        ? (options as any).limit
        : 20,
  };

  const qb = new QueryBuilder(baseQuery, queryOptions)
    .fields()
    .filter()
    .sort()
    .paginate();

  const messages = await qb.modelQuery.exec();

  const pagination =
    options && (options.page !== undefined || options.limit !== undefined)
      ? await qb.countTotal()
      : null;

  return {
    messages: messages.map((message) => withReactionSummary(message)),
    receiver: receiverInfo,
    pagination,
  };
};

/**
 * Jump to a message in context: N messages before + target + N messages after.
 */
const getMessagesAround = async (
  userId: string,
  conversationId: string,
  messageId: string,
  options: { before?: number; after?: number } = {}
) => {
  await assertConversationParticipant(userId, conversationId);

  if (!Types.ObjectId.isValid(messageId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid message id');
  }

  const beforeCount = Math.min(Math.max(Number(options.before) || 12, 1), 50);
  const afterCount = Math.min(Math.max(Number(options.after) || 12, 1), 50);

  const target = await Message.findOne({
    _id: messageId,
    conversation: conversationId,
  });

  if (!target) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found in this conversation');
  }

  const [beforeMessages, afterMessages] = await Promise.all([
    Message.find({
      conversation: conversationId,
      $or: [
        { createdAt: { $lt: target.createdAt } },
        { createdAt: target.createdAt, _id: { $lt: target._id } },
      ],
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(beforeCount)
      .populate([...MESSAGE_POPULATE]),
    Message.find({
      conversation: conversationId,
      $or: [
        { createdAt: { $gt: target.createdAt } },
        { createdAt: target.createdAt, _id: { $gt: target._id } },
      ],
    })
      .sort({ createdAt: 1, _id: 1 })
      .limit(afterCount)
      .populate([...MESSAGE_POPULATE]),
  ]);

  const targetPopulated = await Message.findById(target._id).populate([
    ...MESSAGE_POPULATE,
  ]);

  const messages = [
    ...beforeMessages.reverse(),
    targetPopulated,
    ...afterMessages,
  ].filter(Boolean);

  return {
    targetMessageId: String(target._id),
    messages: messages.map((message) => withReactionSummary(message)),
    hasMoreBefore: beforeMessages.length === beforeCount,
    hasMoreAfter: afterMessages.length === afterCount,
  };
};

const createConversation = async (userId: string, partnerId: string) => {
  if (userId === partnerId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot create a conversation with yourself'
    );
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

const updateMessage = async (userId: string, messageId: string, text: string) => {
  if (!Types.ObjectId.isValid(messageId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid message id');
  }

  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Message text cannot be empty');
  }

  const message = await Message.findById(messageId);
  if (!message) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }

  if (message.sender.toString() !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only update your own messages');
  }

  message.text = normalizedText;
  message.isEdited = true;
  await message.save();

  const messageResponse = await populateMessage(String(message._id));
  const enriched = withReactionSummary(messageResponse);
  const receiverId = message.receiver.toString();

  await emitMessageToParticipants(
    'message_updated',
    enriched,
    userId,
    receiverId
  );

  try {
    await Promise.all([
      emitConversations(userId),
      emitConversations(receiverId),
    ]);
  } catch (error) {
    console.error('Failed to refresh conversations after message update:', error);
  }

  return enriched;
};

/**
 * Toggle/replace reaction on a message.
 * - same emoji again → remove
 * - different emoji → replace
 */
const reactToMessage = async (
  userId: string,
  messageId: string,
  emoji: string
) => {
  await assertChatFeatureEnabled('reaction');

  if (!Types.ObjectId.isValid(messageId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid message id');
  }

  if (!isAllowedMessageEmoji(emoji)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid emoji. Allowed: ${ALLOWED_MESSAGE_EMOJIS.join(' ')}`
    );
  }

  const message = await Message.findById(messageId);
  if (!message) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }

  await assertConversationParticipant(userId, String(message.conversation));

  const reactions = message.reactions || [];
  const existingIndex = reactions.findIndex(
    (reaction) => reaction.user.toString() === userId
  );

  let action: 'added' | 'replaced' | 'removed' = 'added';

  if (existingIndex >= 0) {
    if (reactions[existingIndex].emoji === emoji) {
      reactions.splice(existingIndex, 1);
      action = 'removed';
    } else {
      reactions[existingIndex].emoji = emoji;
      reactions[existingIndex].createdAt = new Date();
      action = 'replaced';
    }
  } else {
    reactions.push({
      user: new Types.ObjectId(userId),
      emoji,
      createdAt: new Date(),
    });
    action = 'added';
  }

  message.reactions = reactions;
  await message.save();

  const messageResponse = await populateMessage(String(message._id));
  const enriched = withReactionSummary(messageResponse);

  const senderId = message.sender.toString();
  const receiverId = message.receiver.toString();
  const otherUserId = senderId === userId ? receiverId : senderId;

  await emitMessageToParticipants(
    'message_reacted',
    {
      messageId: String(message._id),
      conversationId: String(message.conversation),
      action,
      message: enriched,
    },
    userId,
    otherUserId
  );

  return {
    action,
    message: enriched,
  };
};

/**
 * Resolve replyTo payload for message create (REST upload / socket).
 */
const resolveReplyFields = async (
  conversationId: string,
  replyToId?: string | null
) => {
  if (!replyToId) {
    return {
      replyTo: null,
      replyToSnapshot: null,
    };
  }

  await assertChatFeatureEnabled('reply');
  return buildReplySnapshot(replyToId, conversationId);
};

export const ChatServices = {
  getMyConversations,
  getMessageHistory,
  getMessagesAround,
  createConversation,
  updateMessage,
  reactToMessage,
  resolveReplyFields,
  populateMessage,
  withReactionSummary,
  buildReplySnapshot,
  getChatSettings,
  updateChatSetting,
  assertChatFeatureEnabled,
};
