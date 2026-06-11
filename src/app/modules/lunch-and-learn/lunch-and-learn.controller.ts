import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { LunchAndLearnServices } from './lunch-and-learn.service';
import { getUploadedFileUrl } from '../../helper/multer-s3-uploader';

const createLunchAndLearn = catchAsync(async (req: Request, res: Response) => {
  if (req.files && 'event_image' in req.files) {
    req.body.image = getUploadedFileUrl((req.files as any).event_image[0]);
  }

  const result = await LunchAndLearnServices.createLunchAndLearnIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Lunch and Learn event created successfully',
    data: result,
  });
});

const getAllLunchAndLearns = catchAsync(async (req: Request, res: Response) => {
  const result = await LunchAndLearnServices.getAllLunchAndLearnsFromDB(req.query);

  const now = new Date();
  const modifiedResult = result.result.map((event: any) => {
    const startDateTime = new Date(`${event.date}T${event.startTime}:00`);
    const diffInMinutes = Math.floor((startDateTime.getTime() - now.getTime()) / (1000 * 60));

    const eventObj = event.toObject();
    if (req.user.role !== 'admin' && diffInMinutes > 10) {
      delete eventObj.zoomJoinUrl;
      delete eventObj.zoomStartUrl;
      delete eventObj.zoomMeetingPassword;
    }
    return eventObj;
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Lunch and Learn events retrieved successfully',
    meta: result.meta,
    data: modifiedResult,
  });
});

const getSingleLunchAndLearn = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LunchAndLearnServices.getSingleLunchAndLearnFromDB(id);

  const now = new Date();
  const startDateTime = new Date(`${result.date}T${result.startTime}:00`);
  const diffInMinutes = Math.floor((startDateTime.getTime() - now.getTime()) / (1000 * 60));

  const eventObj = result.toObject();
  if (req.user.role !== 'admin' && diffInMinutes > 10) {
    delete eventObj.zoomJoinUrl;
    delete eventObj.zoomStartUrl;
    delete eventObj.zoomMeetingPassword;
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Lunch and Learn event retrieved successfully',
    data: eventObj,
  });
});

const updateLunchAndLearn = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.files && 'event_image' in req.files) {
    req.body.image = getUploadedFileUrl((req.files as any).event_image[0]);
  }

  const result = await LunchAndLearnServices.updateLunchAndLearnIntoDB(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Lunch and Learn event updated successfully',
    data: result,
  });
});

const deleteLunchAndLearn = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LunchAndLearnServices.deleteLunchAndLearnFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Lunch and Learn event deleted successfully',
    data: result,
  });
});

const joinLunchAndLearn = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user._id;
  const result = await LunchAndLearnServices.joinLunchAndLearnEvent(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Joined Lunch and Learn event successfully',
    data: result,
  });
});

export const LunchAndLearnControllers = {
  createLunchAndLearn,
  getAllLunchAndLearns,
  getSingleLunchAndLearn,
  updateLunchAndLearn,
  deleteLunchAndLearn,
  joinLunchAndLearn,
};
