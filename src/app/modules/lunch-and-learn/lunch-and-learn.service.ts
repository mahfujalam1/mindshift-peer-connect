import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { TLunchAndLearn } from './lunch-and-learn.interface';
import { LunchAndLearn } from './lunch-and-learn.model';
import { createZoomMeeting } from '../../helper/zoomHelper';
import QueryBuilder from '../../builder/QueryBuilder';
import User from '../user/user-model';
import { sendBatchPushNotification } from '../../helper/sendPushNotification';

const createLunchAndLearnIntoDB = async (payload: TLunchAndLearn) => {
  const start = new Date(`${payload.date}T${payload.startTime}:00`);
  const end = new Date(`${payload.date}T${payload.endTime}:00`);
  const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));

  if (duration <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'End time must be after start time');
  }

  const zoomMeeting = await createZoomMeeting(payload.title, `${payload.date}T${payload.startTime}:00Z`, duration);

  const eventData = {
    ...payload,
    zoomMeetingId: zoomMeeting.id.toString(),
    zoomMeetingPassword: zoomMeeting.password,
    zoomJoinUrl: zoomMeeting.join_url,
    zoomStartUrl: zoomMeeting.start_url,
  };

  const result = await LunchAndLearn.create(eventData);

  // Send Push Notification to all users
  const allUsers = await User.find({ isDeleted: false, isVerified: true }).select('_id');
  const userIds = allUsers.map((user) => user._id.toString());

  if (userIds.length > 0) {
    await sendBatchPushNotification(
      userIds,
      '🍱 New Lunch and Learn Event',
      `A new Lunch and Learn event "${payload.title}" has been scheduled. Join now!`,
      { type: 'lunch_and_learn', eventId: result._id }
    );
  }

  return result;
};

const getAllLunchAndLearnsFromDB = async (query: Record<string, unknown>) => {
  if (query.available === 'true') {
    query.isExpired = false;
    delete query.available;
  }

  const eventQuery = new QueryBuilder(
    LunchAndLearn.find({ isDeleted: false }).populate('participants'),
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

const getSingleLunchAndLearnFromDB = async (id: string) => {
  const result = await LunchAndLearn.findById(id).populate('participants');
  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Lunch and Learn event not found');
  }
  return result;
};

const updateLunchAndLearnIntoDB = async (id: string, payload: Partial<TLunchAndLearn>) => {
  const isExist = await LunchAndLearn.findById(id);
  if (!isExist || isExist.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Lunch and Learn event not found');
  }

  const result = await LunchAndLearn.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteLunchAndLearnFromDB = async (id: string) => {
  const isExist = await LunchAndLearn.findById(id);
  if (!isExist || isExist.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Lunch and Learn event not found');
  }

  const result = await LunchAndLearn.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  return result;
};

const joinLunchAndLearnEvent = async (id: string, userId: string) => {
  const event = await LunchAndLearn.findById(id);
  if (!event || event.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Lunch and Learn event not found');
  }

  if (event.isExpired) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This event has expired');
  }

  if (event.participants.length >= event.maxParticipants) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Event is full (max 15 participants)');
  }

  if (event.participants.includes(userId as any)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You have already joined this event');
  }

  const result = await LunchAndLearn.findByIdAndUpdate(
    id,
    { $addToSet: { participants: userId } },
    { new: true }
  );

  return result;
};

export const LunchAndLearnServices = {
  createLunchAndLearnIntoDB,
  getAllLunchAndLearnsFromDB,
  getSingleLunchAndLearnFromDB,
  updateLunchAndLearnIntoDB,
  deleteLunchAndLearnFromDB,
  joinLunchAndLearnEvent,
};
