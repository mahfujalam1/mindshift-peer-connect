import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { TEvent, TEventRequest } from './event.interface';
import { Event, EventRequest } from './event.model';
import QueryBuilder from '../../builder/QueryBuilder';
import User from '../user/user-model';
import { sendBatchPushNotification } from '../../helper/sendPushNotification';
import { createZoomMeeting } from '../../helper/zoomHelper';

const createEventRequestIntoDB = async (userId: string, payload: TEventRequest) => {
  const result = await EventRequest.create({
    ...payload,
    user: userId,
  });
  return result;
};

const getAllEventRequestsFromDB = async (query: Record<string, unknown>) => {
  const requestQuery = new QueryBuilder(
    EventRequest.find().populate('user'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await requestQuery.modelQuery;
  const meta = await requestQuery.countTotal();

  return {
    meta,
    result,
  };
};

const getSingleEventRequestFromDB = async (id: string) => {
  const result = await EventRequest.findById(id).populate('user');
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event request not found');
  }
  return result;
};

const acceptEventRequestInDB = async (requestId: string) => {
  const request = await EventRequest.findById(requestId);
  if (!request) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event request not found');
  }

  if (request.status !== 'Pending') {
    throw new AppError(httpStatus.BAD_REQUEST, `Request is already ${request.status}`);
  }

  // Build event data from the request itself — no body needed
  const eventData: TEvent = {
    title: request.title,
    description: request.description,
    image: request.image,
    date: request.date,
    startTime: request.startTime,
    endTime: request.endTime,
    eventType: request.eventType,
    isOnline: request.isOnline,
    maxParticipants: request.maxParticipants,
    participants: [],
    isExpired: false,
    isDeleted: false,
    ...(request.entryRequirements ? { entryRequirements: request.entryRequirements } : {}),
  };

  let zoomData = {};
  if (eventData.isOnline) {
    // Create Zoom Meeting
    const [startHour, startMin] = eventData.startTime.split(':').map(Number);
    const [endHour, endMin] = eventData.endTime.split(':').map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const isoStartTime = `${eventData.date}T${eventData.startTime}:00Z`;

    const meeting = await createZoomMeeting(eventData.title, isoStartTime, duration > 0 ? duration : 60);
    zoomData = {
      zoomMeetingId: meeting.id,
      zoomMeetingPassword: meeting.password,
      zoomJoinUrl: meeting.join_url,
      zoomStartUrl: meeting.start_url,
    };
  }

  const event = await Event.create({
    ...eventData,
    ...zoomData,
  });

  await EventRequest.findByIdAndUpdate(requestId, { status: 'Accepted' });

  // Send Push Notification to all users
  const allUsers = await User.find({ isDeleted: false, isVerified: true }).select('_id');
  const userIds = allUsers.map((user) => user._id.toString());

  if (userIds.length > 0) {
    await sendBatchPushNotification(
      userIds,
      `🎉 New ${event.eventType}`,
      `A new ${event.eventType} "${event.title}" has been scheduled. Join now!`,
      { type: 'event', eventId: event._id, eventType: event.eventType }
    );
  }

  return event;
};

const rejectEventRequestInDB = async (requestId: string) => {
  const result = await EventRequest.findByIdAndUpdate(requestId, { status: 'Rejected' }, { new: true });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event request not found');
  }
  return result;
};

const getAllEventsFromDB = async (query: Record<string, unknown>) => {
  if (query.available === 'true') {
    query.isExpired = false;
    delete query.available;
  }

  const eventQuery = new QueryBuilder(
    Event.find({ isDeleted: false }).populate('participants'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await eventQuery.modelQuery;
  const meta = await eventQuery.countTotal();

  return {
    meta,
    result,
  };
};

const getSingleEventFromDB = async (id: string) => {
  const result = await Event.findById(id).populate('participants');
  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }
  return result;
};

const updateEventIntoDB = async (id: string, payload: Partial<TEvent>) => {
  const isExist = await Event.findById(id);
  if (!isExist || isExist.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  const result = await Event.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteEventFromDB = async (id: string) => {
  const isExist = await Event.findById(id);
  if (!isExist || isExist.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  const result = await Event.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  return result;
};

const joinEvent = async (id: string, userId: string) => {
  const event = await Event.findById(id);
  if (!event || event.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  if (event.isExpired) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This event has expired');
  }

  if (event.participants.length >= event.maxParticipants) {
    throw new AppError(httpStatus.BAD_REQUEST, `Event is full (max ${event.maxParticipants} participants)`);
  }

  if (event.participants.includes(userId as any)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You have already joined this event');
  }

  const result = await Event.findByIdAndUpdate(
    id,
    { $addToSet: { participants: userId } },
    { new: true }
  );

  return result;
};

const leaveEvent = async (id: string, userId: string) => {
  const event = await Event.findById(id);
  if (!event || event.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  const result = await Event.findByIdAndUpdate(
    id,
    { $pull: { participants: userId } },
    { new: true }
  );

  return result;
};

export const EventServices = {
  createEventRequestIntoDB,
  getAllEventRequestsFromDB,
  getSingleEventRequestFromDB,
  acceptEventRequestInDB,
  rejectEventRequestInDB,
  getAllEventsFromDB,
  getSingleEventFromDB,
  updateEventIntoDB,
  deleteEventFromDB,
  joinEvent,
  leaveEvent,
};
