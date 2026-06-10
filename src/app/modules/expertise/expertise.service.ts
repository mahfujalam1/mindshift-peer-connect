import Expertise from './expertise.model';
import { Types } from 'mongoose';
import httpStatus from 'http-status';
import AppError from '../../error/appError';

/**
 * Create a new expertise entry for a user.
 */
export const createExpertise = async (userId: string, name: string) => {
  const expertise = await Expertise.create({ user: new Types.ObjectId(userId), name });
  return expertise;
};

/**
 * Retrieve all expertise entries of a user.
 */
export const getAllExpertise = async (userId: string) => {
  return Expertise.find({ user: new Types.ObjectId(userId) });
};

/**
 * Get a single expertise by its id.
 */
export const getExpertiseById = async (expertiseId: string) => {
  const expertise = await Expertise.findById(expertiseId);
  if (!expertise) {
    throw new AppError(httpStatus.NOT_FOUND, 'Expertise not found');
  }
  return expertise;
};

/**
 * Update an expertise name.
 */
export const updateExpertise = async (expertiseId: string, name: string) => {
  const expertise = await Expertise.findByIdAndUpdate(
    expertiseId,
    { name },
    { new: true }
  );
  if (!expertise) {
    throw new AppError(httpStatus.NOT_FOUND, 'Expertise not found');
  }
  return expertise;
};

/**
 * Delete an expertise entry.
 */
export const deleteExpertise = async (expertiseId: string) => {
  const expertise = await Expertise.findByIdAndDelete(expertiseId);
  if (!expertise) {
    throw new AppError(httpStatus.NOT_FOUND, 'Expertise not found');
  }
  return expertise;
};
