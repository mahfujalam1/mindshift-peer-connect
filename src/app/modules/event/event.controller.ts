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
  const result = await EventServices.acceptEventRequestInDB(id, req.body);
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

const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const result = await EventServices.getAllEventsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Events retrieved successfully',
    data: result,
  });
});

const getSingleEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await EventServices.getSingleEventFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event retrieved successfully',
    data: result,
  });
});

const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await EventServices.updateEventIntoDB(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event updated successfully',
    data: result,
  });
});

const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await EventServices.deleteEventFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event deleted successfully',
    data: result,
  });
});

const joinEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { id } = req.params;
  const result = await EventServices.joinEvent(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Joined event successfully',
    data: result,
  });
});

const leaveEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { id } = req.params;
  const result = await EventServices.leaveEvent(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Left event successfully',
    data: result,
  });
});

export const EventControllers = {
  createEventRequest,
  getAllEventRequests,
  getSingleEventRequest,
  acceptEventRequest,
  rejectEventRequest,
  getAllEvents,
  getSingleEvent,
  updateEvent,
  deleteEvent,
  joinEvent,
  leaveEvent,
};
