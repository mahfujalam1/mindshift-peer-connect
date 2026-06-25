import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { LiveDiscussion, LiveMessage } from './live-discussion.model';
import { Types } from 'mongoose';

const createInitialGroups = async () => {
  const group1 = await LiveDiscussion.findOne({ name: 'Group 1' });
  if (!group1) {
    await LiveDiscussion.create({ name: 'Group 1', members: [], limit: 50 });
  }

  const group2 = await LiveDiscussion.findOne({ name: 'Group 2' });
  if (!group2) {
    await LiveDiscussion.create({ name: 'Group 2', members: [], limit: 50 });
  }
};

const getAllRoomsFromDB = async () => {
  const result = await LiveDiscussion.find().populate('members', 'fullName email profileImage');
  return result;
};

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
    const lastGroup = await LiveDiscussion.findOne().sort({ createdAt: -1 });
    if (lastGroup) {
      const lastGroupName = lastGroup.name;
      const lastGroupNumber = parseInt(lastGroupName.replace('Group ', '')) || 0;
      const nextGroupName = `Group ${lastGroupNumber + 1}`;
      
      const isExist = await LiveDiscussion.findOne({ name: nextGroupName });
      if (!isExist) {
        await LiveDiscussion.create({ name: nextGroupName, members: [], limit: 50 });
      }
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
  const result = await LiveDiscussion.find({ members: { $in: [userId] } }).populate('members', 'fullName email profileImage');
  return result;
}

export const LiveDiscussionServices = {
  createInitialGroups,
  getAllRoomsFromDB,
  joinRoomInDB,
  getMessagesFromDB,
  getRoomDetailsFromDB,
  myJoinedRooms
};
