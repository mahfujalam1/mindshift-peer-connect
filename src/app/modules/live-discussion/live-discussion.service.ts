import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { LiveDiscussion, LiveMessage } from './live-discussion.model';
import { Types } from 'mongoose';
import { Follow } from '../follow/follow.model';

const createInitialRooms = async () => {
  for (const roomNumber of ["Everything Therapy", "The Chit-Chat Room", "The Promo Corner"]) {
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

  // Auto-scaling: after the 3 seeded named rooms, overflow rooms start at Room 4
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

    // Seeded rooms count as 1–3; first overflow is Room 4
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
  const result = await LiveMessage.find({ room: roomId })
    .populate('sender', 'fullName email profileImage')
    .sort({ createdAt: 1 });
  return result;
};

const getRoomDetailsFromDB = async (roomId: string, userId: string) => {
  const result = await LiveDiscussion.findById(roomId).populate('members', 'fullName email profileImage');
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
}

export const LiveDiscussionServices = {
  createInitialRooms,
  getAllRoomsFromDB,
  joinRoomInDB,
  getMessagesFromDB,
  getRoomDetailsFromDB,
  myJoinedRooms
};
