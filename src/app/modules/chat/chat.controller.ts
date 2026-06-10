import httpStatus from 'http-status';
import AppError from '../../error/appError';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { ChatServices } from './chat.service';
import { getUploadedFileKey, getUploadedFileUrl } from '../../helper/multer-s3-uploader';

type TChatFiles = {
  chat_file?: Express.Multer.File[];
  file?: Express.Multer.File[];
};

const getMyConversations = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await ChatServices.getMyConversations(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conversations retrieved successfully',
    data: result,
  });
});

const getMessageHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  const result = await ChatServices.getMessageHistory(userId, conversationId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message history retrieved successfully',
    data: result,
  });
});

const uploadChatFile = catchAsync(async (req, res) => {
  const files = req.files as TChatFiles | undefined;
  const file = files?.chat_file?.[0] || files?.file?.[0];
  const url = getUploadedFileUrl(file);

  if (!file || !url) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Chat file is required');
  }

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Chat file uploaded successfully',
    data: {
      url,
      key: getUploadedFileKey(file),
      originalName: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
    },
  });
});

export const ChatControllers = {
  getMyConversations,
  getMessageHistory,
  uploadChatFile,
};
