import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { TCoffeeConnect } from './coffee-connect.interface';
import { CoffeeConnect } from './coffee-connect.model';
import { createZoomMeeting } from '../../helper/zoomHelper';
import QueryBuilder from '../../builder/QueryBuilder';
import { sendPushNotificationToAllUsers } from '../../helper/sendPushNotification';
import { buildEventDateTimes } from '../../helper/eventDateTime';

const createCoffeeConnectIntoDB = async (payload: TCoffeeConnect) => {
  const { startAt, endAt, duration } = buildEventDateTimes(
    payload.date,
    payload.startTime,
    payload.endTime,
    payload.timezone
  );

  // Create Zoom meeting
  const zoomMeeting = await createZoomMeeting(
    payload.title,
    startAt.toISOString(),
    duration
  );

  const coffeeConnectData = {
    ...payload,
    startAt,
    endAt,
    zoomMeetingId: zoomMeeting.id.toString(),
    zoomMeetingPassword: zoomMeeting.password,
    zoomJoinUrl: zoomMeeting.join_url,
    zoomStartUrl: zoomMeeting.start_url,
  };

  const result = await CoffeeConnect.create(coffeeConnectData);

  // Keep notification delivery outside the event creation response path.
  void sendPushNotificationToAllUsers(
      '☕ New Coffee Connect Event',
      `A new Coffee Connect event "${payload.title}" has been scheduled. Join now!`,
      { type: 'coffee_connect', eventId: result._id }
  ).catch((error) => {
    console.error('Coffee Connect notification failed:', error);
  });

  return result;
};

const getAllCoffeeConnectsFromDB = async (query: Record<string, unknown>) => {
  if (query.available === 'true') {
    query.isExpired = false;
    delete query.available;
  }

  const coffeeConnectQuery = new QueryBuilder(
    CoffeeConnect.find({ isDeleted: false }).populate('participants'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await coffeeConnectQuery.modelQuery;
  const meta = await coffeeConnectQuery.countTotal();

  return {
    meta,
    result,
  };
};

const getSingleCoffeeConnectFromDB = async (id: string) => {
  const result = await CoffeeConnect.findById(id).populate('participants');
  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coffee Connect event not found');
  }
  return result;
};

const updateCoffeeConnectIntoDB = async (id: string, payload: Partial<TCoffeeConnect>) => {
  const isExist = await CoffeeConnect.findById(id);
  if (!isExist || isExist.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coffee Connect event not found');
  }

  const updatePayload: Partial<TCoffeeConnect> = { ...payload };
  if (payload.date || payload.startTime || payload.endTime || payload.timezone) {
    const { startAt, endAt } = buildEventDateTimes(
      payload.date || isExist.date,
      payload.startTime || isExist.startTime,
      payload.endTime || isExist.endTime,
      payload.timezone || isExist.timezone
    );
    updatePayload.startAt = startAt;
    updatePayload.endAt = endAt;
    updatePayload.isExpired = false;
    updatePayload.notified2h = false;
    updatePayload.notified10m = false;
  }

  const result = await CoffeeConnect.findByIdAndUpdate(id, updatePayload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteCoffeeConnectFromDB = async (id: string) => {
  const isExist = await CoffeeConnect.findById(id);
  if (!isExist || isExist.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coffee Connect event not found');
  }

  const result = await CoffeeConnect.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  return result;
};

const joinCoffeeConnectEvent = async (id: string, userId: string) => {
  const coffeeConnect = await CoffeeConnect.findById(id);
  if (!coffeeConnect || coffeeConnect.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coffee Connect event not found');
  }

  if (coffeeConnect.isExpired) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This event has expired');
  }

  if (coffeeConnect.participants.length >= coffeeConnect.maxParticipants) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Event is full (max 15 participants)');
  }

  if (coffeeConnect.participants.includes(userId as any)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You have already joined this event');
  }

  const result = await CoffeeConnect.findByIdAndUpdate(
    id,
    { $addToSet: { participants: userId } },
    { new: true }
  );

  return result;
};

export const CoffeeConnectServices = {
  createCoffeeConnectIntoDB,
  getAllCoffeeConnectsFromDB,
  getSingleCoffeeConnectFromDB,
  updateCoffeeConnectIntoDB,
  deleteCoffeeConnectFromDB,
  joinCoffeeConnectEvent,
};
