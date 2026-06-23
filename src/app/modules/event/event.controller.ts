import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { EventServices } from './event.service';

const createEventRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await EventServices.createEventRequestIntoDB(userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Event request submitted successfully',
    data: result,
  });
});

const getAllEventRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await EventServices.getAllEventRequestsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event requests retrieved successfully',
    data: result,
  });
});

const getSingleEventRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await EventServices.getSingleEventRequestFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event request retrieved successfully',
    data: result,
  });
});

const acceptEventRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await EventServices.acceptEventRequestInDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event request accepted and event created',
    data: result,
  });
});

const rejectEventRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await EventServices.rejectEventRequestInDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event request rejected successfully',
    data: result,
  });
});

// Join event — requires eventType query param
const joinEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { eventType } = req.query;
  const result = await EventServices.joinEvent(id, userId, eventType as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Joined event successfully',
    data: result,
  });
});

// Leave event — requires eventType query param
const leaveEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { eventType } = req.query;
  const result = await EventServices.leaveEvent(id, userId, eventType as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Left event successfully',
    data: result,
  });
});

// Get my joined events — supports eventType & available query params
const getMyJoinedEvents = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await EventServices.getMyJoinedEventsFromDB(userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My joined events retrieved successfully',
    data: result,
  });
});

export const EventControllers = {
  createEventRequest,
  getAllEventRequests,
  getSingleEventRequest,
  acceptEventRequest,
  rejectEventRequest,
  joinEvent,
  leaveEvent,
  getMyJoinedEvents,
};
