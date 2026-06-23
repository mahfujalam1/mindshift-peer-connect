import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { SocialEventServices } from './social-event.service';
import { getUploadedFileUrl } from '../../helper/multer-s3-uploader';

const createSocialEvent = catchAsync(async (req: Request, res: Response) => {
  if (req.files && 'event_image' in req.files) {
    req.body.image = getUploadedFileUrl((req.files as any).event_image[0]);
  }

  const result = await SocialEventServices.createSocialEventIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Social event created successfully',
    data: result,
  });
});

const getAllSocialEvents = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialEventServices.getAllSocialEventsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Social events retrieved successfully',
    data: result.result,
  });
});

const getSingleSocialEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SocialEventServices.getSingleSocialEventFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Social event retrieved successfully',
    data: result,
  });
});

const updateSocialEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.files && 'event_image' in req.files) {
    req.body.image = getUploadedFileUrl((req.files as any).event_image[0]);
  }

  const result = await SocialEventServices.updateSocialEventIntoDB(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Social event updated successfully',
    data: result,
  });
});

const deleteSocialEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SocialEventServices.deleteSocialEventFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Social event deleted successfully',
    data: result,
  });
});

const joinSocialEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await SocialEventServices.joinSocialEvent(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Joined social event successfully',
    data: result,
  });
});

export const SocialEventControllers = {
  createSocialEvent,
  getAllSocialEvents,
  getSingleSocialEvent,
  updateSocialEvent,
  deleteSocialEvent,
  joinSocialEvent,
};
