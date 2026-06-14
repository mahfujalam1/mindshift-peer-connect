import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { LiveDiscussionServices } from './live-discussion.service';

const getAllRooms = catchAsync(async (req: Request, res: Response) => {
  const result = await LiveDiscussionServices.getAllRoomsFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Live discussion rooms retrieved successfully',
    data: result,
  });
});

const joinRoom = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { roomId } = req.params;
  const result = await LiveDiscussionServices.joinRoomInDB(userId, roomId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Joined live discussion room successfully',
    data: result,
  });
});

const getMessages = catchAsync(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const result = await LiveDiscussionServices.getMessagesFromDB(roomId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Live discussion messages retrieved successfully',
    data: result,
  });
});

export const LiveDiscussionControllers = {
  getAllRooms,
  joinRoom,
  getMessages,
};
