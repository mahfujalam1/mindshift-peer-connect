import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { TSocialEvent } from './social-event.interface';
import { SocialEvent } from './social-event.model';
import QueryBuilder from '../../builder/QueryBuilder';
import User from '../user/user-model';
import { sendBatchPushNotification } from '../../helper/sendPushNotification';

const createSocialEventIntoDB = async (payload: TSocialEvent) => {
  const result = await SocialEvent.create(payload);

  // Send Push Notification to all users
  const allUsers = await User.find({ isDeleted: false, isVerified: true }).select('_id');
  const userIds = allUsers.map((user) => user._id.toString());

  if (userIds.length > 0) {
    await sendBatchPushNotification(
      userIds,
      '🎉 New Social Event',
      `A new social event "${payload.title}" has been announced. Check it out!`,
      { type: 'social_event', eventId: result._id }
    );
  }

  return result;
};

const getAllSocialEventsFromDB = async (query: Record<string, unknown>) => {
  if (query.available === 'true') {
    query.isExpired = false;
    delete query.available;
  }

  const eventQuery = new QueryBuilder(
    SocialEvent.find({ isDeleted: false }).populate('participants'),
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

const getSingleSocialEventFromDB = async (id: string) => {
  const result = await SocialEvent.findById(id).populate('participants');
  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Social event not found');
  }
  return result;
};

const updateSocialEventIntoDB = async (id: string, payload: Partial<TSocialEvent>) => {
  const isExist = await SocialEvent.findById(id);
  if (!isExist || isExist.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Social event not found');
  }

  const result = await SocialEvent.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteSocialEventFromDB = async (id: string) => {
  const isExist = await SocialEvent.findById(id);
  if (!isExist || isExist.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Social event not found');
  }

  const result = await SocialEvent.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  return result;
};

const joinSocialEvent = async (id: string, userId: string) => {
  const event = await SocialEvent.findById(id);
  if (!event || event.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Social event not found');
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

  const result = await SocialEvent.findByIdAndUpdate(
    id,
    { $addToSet: { participants: userId } },
    { new: true }
  );

  return result;
};

export const SocialEventServices = {
  createSocialEventIntoDB,
  getAllSocialEventsFromDB,
  getSingleSocialEventFromDB,
  updateSocialEventIntoDB,
  deleteSocialEventFromDB,
  joinSocialEvent,
};
