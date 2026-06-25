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


const getRoomDetails = catchAsync(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const result = await LiveDiscussionServices.getRoomDetailsFromDB(roomId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Live discussion room details retrieved successfully',
    data: result,
  });
});



const myJoinedRooms = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const allRooms = await LiveDiscussionServices.myJoinedRooms(userId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My joined live discussion rooms retrieved successfully',
    data: allRooms,
  });
});

export const LiveDiscussionControllers = {
  getAllRooms,
  joinRoom,
  getMessages,
  getRoomDetails,
  myJoinedRooms
};
