import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { getIO } from '../../socket/socket';
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

const getMessagesAround = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { roomId, messageId } = req.params;
  const { before, after } = req.query as { before?: string; after?: string };

  const result = await LiveDiscussionServices.getMessagesAround(
    userId,
    roomId,
    messageId,
    {
      before: before ? Number(before) : undefined,
      after: after ? Number(after) : undefined,
    }
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Live discussion messages around target retrieved successfully',
    data: result,
  });
});

const reactToMessage = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { messageId } = req.params;
  const { emoji } = req.body;

  const result = await LiveDiscussionServices.reactToLiveMessage(
    userId,
    messageId,
    emoji
  );

  try {
    const io = getIO();
    io.to(result.roomId).emit('live_message_reacted', {
      messageId,
      roomId: result.roomId,
      action: result.action,
      message: result.message,
    });
  } catch {
    // socket may not be initialised
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Reaction ${result.action} successfully`,
    data: result,
  });
});

const getRoomDetails = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { roomId } = req.params;
  const result = await LiveDiscussionServices.getRoomDetailsFromDB(
    roomId,
    userId as string
  );
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
  getMessagesAround,
  reactToMessage,
  getRoomDetails,
  myJoinedRooms,
};
