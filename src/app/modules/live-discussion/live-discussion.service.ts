import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../error/appError';
import { getPublicFileUrl } from '../../helper/multer-s3-uploader';
import { Follow } from '../follow/follow.model';
import {
  ALLOWED_MESSAGE_EMOJIS,
  isAllowedMessageEmoji,
} from '../chat/chat.constants';
import ChatSetting from '../chat/chat-setting.model';
import { TChatFeature } from '../chat/chat-setting.interface';
import { LIVE_MESSAGE_POPULATE } from './live-discussion.constants';
import { TLiveReplyToSnapshot } from './live-discussion.interface';
import { LiveDiscussion, LiveMessage } from './live-discussion.model';

type TPlainObject = Record<string, unknown>;

const defaultChatSettings = [
  { feature: 'reply' as const, status: true },
  { feature: 'reaction' as const, status: true },
];

const assertChatFeatureEnabled = async (feature: TChatFeature) => {
  const savedSettings = await ChatSetting.find({}).lean();
  const settings = defaultChatSettings.map(
    (defaultSetting) =>
      savedSettings.find((item) => item.feature === defaultSetting.feature) ||
      defaultSetting
  );
  const enabled = settings.find((item) => item.feature === feature)!.status;
  if (!enabled) {
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

const normalizeLiveMessageUrls = (message: unknown) => {
  if (!message || typeof message !== 'object') {
    return message;
  }

  const messageObj = toPlainObject(message);
  if (typeof messageObj.file === 'string') {
    messageObj.file = getPublicFileUrl(messageObj.file) || messageObj.file;
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
  const messageObj = normalizeLiveMessageUrls(message) as TPlainObject;
  const reactions = Array.isArray(messageObj.reactions)
    ? (messageObj.reactions as Array<{ emoji: string; user: unknown }>)
    : [];

  return {
    ...messageObj,
    reactionSummary: getReactionSummary(reactions),
  };
};

const populateLiveMessage = async (messageId: Types.ObjectId | string) => {
  const populated = await LiveMessage.findById(messageId).populate([
    ...LIVE_MESSAGE_POPULATE,
  ]);
  return withReactionSummary(populated);
};

const assertRoomMember = async (userId: string, roomId: string) => {
  if (!Types.ObjectId.isValid(roomId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid room id');
  }

  const room = await LiveDiscussion.findById(roomId);
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, 'Room not found');
  }

  const isMember = room.members.some(
    (memberId) => memberId.toString() === userId
  );
  if (!isMember) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not a member of this room'
    );
  }

  return room;
};

const buildLiveReplySnapshot = async (
  replyToId: string,
  roomId: string
): Promise<{ replyTo: Types.ObjectId; replyToSnapshot: TLiveReplyToSnapshot }> => {
  if (!Types.ObjectId.isValid(replyToId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid replyTo message id');
  }

  const repliedMessage = await LiveMessage.findById(replyToId)
    .populate({ path: 'sender', select: 'fullName' })
    .lean();

  if (!repliedMessage) {
    throw new AppError(httpStatus.NOT_FOUND, 'Replied message not found');
  }

  if (String(repliedMessage.room) !== String(roomId)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You can only reply to a message in the same room'
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

const resolveLiveReplyFields = async (
  roomId: string,
  replyToId?: string | null
) => {
  if (!replyToId) {
    return {
      replyTo: null,
      replyToSnapshot: null,
    };
  }

  await assertChatFeatureEnabled('reply');
  return buildLiveReplySnapshot(replyToId, roomId);
};

const createInitialRooms = async () => {
  for (const roomNumber of ['Everything Therapy', 'The Chit-Chat Room', 'The Promo Corner']) {
    const roomName = `${roomNumber}`;
    const roomExists = await LiveDiscussion.exists({ name: roomName });

    if (!roomExists) {
      const migratedRoom = await LiveDiscussion.findOneAndUpdate(
        { name: `${roomNumber}` },
        { $set: { name: roomName } },
        { new: true }
      );

      if (!migratedRoom) {
        await LiveDiscussion.create({
          name: roomName,
          members: [],
          limit: 50,
        });
      }
    }
  }
};

const roomResponseQuery = () =>
  LiveDiscussion.find()
    .populate('members', '_id fullName email profileImage')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: '_id fullName email profileImage',
      },
    })
    .sort({ createdAt: 1 });

const getAllRoomsFromDB = async () => roomResponseQuery();

const joinRoomInDB = async (userId: string, roomId: string) => {
  const room = await LiveDiscussion.findById(roomId);
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, 'Room not found');
  }

  if (room.members.some((memberId) => memberId.toString() === userId)) {
    return room;
  }

  if (room.members.length >= room.limit) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Room is full');
  }

  const result = await LiveDiscussion.findByIdAndUpdate(
    roomId,
    { $addToSet: { members: userId } },
    { new: true }
  );

  if (result && result.members.length >= result.limit) {
    const numberedRooms = await LiveDiscussion.find({
      name: { $regex: /^(Room|Group) \d+$/ },
    }).select('name');

    const lastRoomNumber = Math.max(
      0,
      ...numberedRooms.map((existingRoom) =>
        Number(existingRoom.name.match(/\d+$/)?.[0] || 0)
      )
    );

    const nextRoomNumber = Math.max(3, lastRoomNumber) + 1;
    const nextRoomName = `Room ${nextRoomNumber}`;

    const roomExists = await LiveDiscussion.exists({ name: nextRoomName });
    if (!roomExists) {
      await LiveDiscussion.create({
        name: nextRoomName,
        members: [],
        limit: 50,
      });
    }
  }

  return result;
};

const getMessagesFromDB = async (roomId: string) => {
  const messages = await LiveMessage.find({ room: roomId })
    .populate([...LIVE_MESSAGE_POPULATE])
    .sort({ createdAt: 1 });

  return messages.map((message) => withReactionSummary(message));
};

const getMessagesAround = async (
  userId: string,
  roomId: string,
  messageId: string,
  options: { before?: number; after?: number } = {}
) => {
  await assertRoomMember(userId, roomId);

  if (!Types.ObjectId.isValid(messageId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid message id');
  }

  const beforeCount = Math.min(Math.max(Number(options.before) || 12, 1), 50);
  const afterCount = Math.min(Math.max(Number(options.after) || 12, 1), 50);

  const target = await LiveMessage.findOne({
    _id: messageId,
    room: roomId,
  });

  if (!target) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found in this room');
  }

  const [beforeMessages, afterMessages] = await Promise.all([
    LiveMessage.find({
      room: roomId,
      $or: [
        { createdAt: { $lt: target.createdAt } },
        { createdAt: target.createdAt, _id: { $lt: target._id } },
      ],
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(beforeCount)
      .populate([...LIVE_MESSAGE_POPULATE]),
    LiveMessage.find({
      room: roomId,
      $or: [
        { createdAt: { $gt: target.createdAt } },
        { createdAt: target.createdAt, _id: { $gt: target._id } },
      ],
    })
      .sort({ createdAt: 1, _id: 1 })
      .limit(afterCount)
      .populate([...LIVE_MESSAGE_POPULATE]),
  ]);

  const targetPopulated = await LiveMessage.findById(target._id).populate([
    ...LIVE_MESSAGE_POPULATE,
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

const reactToLiveMessage = async (
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

  const message = await LiveMessage.findById(messageId);
  if (!message) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found');
  }

  await assertRoomMember(userId, String(message.room));

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

  const enriched = await populateLiveMessage(String(message._id));

  return {
    action,
    roomId: String(message.room),
    message: enriched,
  };
};

const getRoomDetailsFromDB = async (roomId: string, userId: string) => {
  const result = await LiveDiscussion.findById(roomId).populate(
    'members',
    'fullName email profileImage'
  );
  if (!result) {
    return null;
  }

  const roomObj = result.toObject();
  const memberIds = roomObj.members.map((member: any) => member._id);

  if (memberIds.length === 0) {
    return roomObj;
  }

  const follows = await Follow.find({
    $or: [
      { follower: new Types.ObjectId(userId), following: { $in: memberIds } },
      { follower: { $in: memberIds }, following: new Types.ObjectId(userId) },
    ],
  });

  const connectedSet = new Set<string>();
  follows.forEach((f) => {
    if (f.follower.toString() === userId) {
      connectedSet.add(f.following.toString());
    } else {
      connectedSet.add(f.follower.toString());
    }
  });

  roomObj.members = roomObj.members.map((member: any) => {
    const mId = member._id.toString();
    return {
      ...member,
      isConnected: mId === userId ? false : connectedSet.has(mId),
    };
  });

  return roomObj;
};

const myJoinedRooms = async (userId: string) => {
  const result = await roomResponseQuery().find({
    members: new Types.ObjectId(userId),
  });

  return result.sort((firstRoom: any, secondRoom: any) => {
    const firstMessageTime = firstRoom.lastMessage?.createdAt
      ? new Date(firstRoom.lastMessage.createdAt).getTime()
      : 0;
    const secondMessageTime = secondRoom.lastMessage?.createdAt
      ? new Date(secondRoom.lastMessage.createdAt).getTime()
      : 0;

    return secondMessageTime - firstMessageTime;
  });
};

export const LiveDiscussionServices = {
  createInitialRooms,
  getAllRoomsFromDB,
  joinRoomInDB,
  getMessagesFromDB,
  getMessagesAround,
  getRoomDetailsFromDB,
  myJoinedRooms,
  resolveLiveReplyFields,
  reactToLiveMessage,
  populateLiveMessage,
  withReactionSummary,
  assertRoomMember,
};
