import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { CoffeeConnectServices } from './coffee-connect.service';
import { getUploadedFileUrl } from '../../helper/multer-s3-uploader';

const createCoffeeConnect = catchAsync(async (req: Request, res: Response) => {
  if (req.files && 'event_image' in req.files) {
    req.body.image = getUploadedFileUrl((req.files as any).event_image[0]);
  }

  const result = await CoffeeConnectServices.createCoffeeConnectIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Coffee Connect event created successfully',
    data: result,
  });
});

const getAllCoffeeConnects = catchAsync(async (req: Request, res: Response) => {
  const result = await CoffeeConnectServices.getAllCoffeeConnectsFromDB(req.query);

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
    message: 'Coffee Connect events retrieved successfully',
    data: modifiedResult,
  });
});

const getSingleCoffeeConnect = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CoffeeConnectServices.getSingleCoffeeConnectFromDB(id);

  const now = new Date();
  const startDateTime = new Date(`${result.date}T${result.startTime}:00`);
  const diffInMinutes = Math.floor((startDateTime.getTime() - now.getTime()) / (1000 * 60));

  const eventObj = result.toObject();


  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coffee Connect event retrieved successfully',
    data: eventObj,
  });
});

const updateCoffeeConnect = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.files && 'event_image' in req.files) {
    req.body.image = getUploadedFileUrl((req.files as any).event_image[0]);
  }

  const result = await CoffeeConnectServices.updateCoffeeConnectIntoDB(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coffee Connect event updated successfully',
    data: result,
  });
});

const deleteCoffeeConnect = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CoffeeConnectServices.deleteCoffeeConnectFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coffee Connect event deleted successfully',
    data: result,
  });
});

const joinCoffeeConnect = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await CoffeeConnectServices.joinCoffeeConnectEvent(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Joined Coffee Connect event successfully',
    data: result,
  });
});

export const CoffeeConnectControllers = {
  createCoffeeConnect,
  getAllCoffeeConnects,
  getSingleCoffeeConnect,
  updateCoffeeConnect,
  deleteCoffeeConnect,
  joinCoffeeConnect,
};
