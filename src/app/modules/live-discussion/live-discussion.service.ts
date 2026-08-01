import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { LiveDiscussion, LiveMessage } from './live-discussion.model';
import { Types } from 'mongoose';

const createInitialRooms = async () => {
  for (const roomNumber of [1, 2]) {
    const roomName = `Room ${roomNumber}`;
    const roomExists = await LiveDiscussion.exists({ name: roomName });

    if (!roomExists) {
      const migratedRoom = await LiveDiscussion.findOneAndUpdate(
        { name: `Group ${roomNumber}` },
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
    .sort({ updatedAt: -1 });

const getAllRoomsFromDB = async () => roomResponseQuery();

const joinRoomInDB = async (userId: string, roomId: string) => {
  const room = await LiveDiscussion.findById(roomId);
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, 'Room not found');
  }

  if (room.members.includes(new Types.ObjectId(userId))) {
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

  // Auto-scaling logic: If this room is now full, create the next one
  if (result && result.members.length >= result.limit) {
    const rooms = await LiveDiscussion.find({
      name: { $regex: /^(Room|Group) \d+$/ },
    }).select('name');
    const lastRoomNumber = Math.max(
      0,
      ...rooms.map((room) => Number(room.name.match(/\d+$/)?.[0] || 0))
    );
    const nextRoomName = `Room ${lastRoomNumber + 1}`;

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
  const result = await LiveMessage.find({ room: roomId })
    .populate('sender', 'fullName email profileImage')
    .sort({ createdAt: 1 });
  return result;
};

const getRoomDetailsFromDB = async (roomId: string) => {
  const result = await LiveDiscussion.findById(roomId).populate('members', 'fullName email profileImage');
  return result;
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
}

export const LiveDiscussionServices = {
  createInitialRooms,
  getAllRoomsFromDB,
  joinRoomInDB,
  getMessagesFromDB,
  getRoomDetailsFromDB,
  myJoinedRooms
};
