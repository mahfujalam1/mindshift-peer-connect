import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../error/appError';
import User from './user-model';

export const areUsersBlocked = async (firstUserId: string, secondUserId: string) => {
  if (!Types.ObjectId.isValid(firstUserId) || !Types.ObjectId.isValid(secondUserId)) {
    return false;
  }

  const relationship = await User.exists({
    $or: [
      { _id: firstUserId, blockedUsers: new Types.ObjectId(secondUserId) },
      { _id: secondUserId, blockedUsers: new Types.ObjectId(firstUserId) },
    ],
  });

  return Boolean(relationship);
};

export const assertUsersCanInteract = async (
  firstUserId: string,
  secondUserId: string
) => {
  if (await areUsersBlocked(firstUserId, secondUserId)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You cannot interact with this user because one of you has blocked the other'
    );
  }
};
