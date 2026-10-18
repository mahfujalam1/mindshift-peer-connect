import Expertise from './expertise.model';
import { Types } from 'mongoose';
import httpStatus from 'http-status';
import AppError from '../../error/appError';
import User from '../user/user-model';

/**
 * Create a new expertise entry (Admin only).
 */
export const createExpertise = async (payload: any) => {
  const name = typeof payload === 'string' ? payload.trim() : payload?.name?.trim();
  if (!name) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Expertise name is required');
  }

  const existing = await Expertise.findOne({
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  });

  if (existing) {
    throw new AppError(httpStatus.CONFLICT, 'Expertise with this name already exists');
  }

  const created = await Expertise.create({
    name,
    icon: payload?.icon || null,
  });

  return created;
};

/**
 * Retrieve all expertise entries (master admin list).
 */
export const getAllExpertise = async () => {
  return Expertise.find()
    .select('_id name icon')
    .collation({ locale: 'en', strength: 2 })
    .sort({ name: 1 })
    .lean();
};

/**
 * Retrieve only the expertise filters created by admins.
 */
export const getAdminExpertise = async () => {
  return getAllExpertise();
};

/**
 * Retrieve all expertise entries selected by a user from their profile.
 */
export const getMyExpertise = async (userId: string) => {
  const user = await User.findById(userId)
    .select('expertise')
    .populate('expertise', '_id name icon')
    .lean();

  return user?.expertise || [];
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
export const updateExpertise = async (expertiseId: string, payload: { name?: string; icon?: string }) => {
  const updateData: Record<string, any> = {};

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Expertise name cannot be empty');
    }

    const existing = await Expertise.findOne({
      _id: { $ne: expertiseId },
      name: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });

    if (existing) {
      throw new AppError(httpStatus.CONFLICT, 'Expertise with this name already exists');
    }

    updateData.name = trimmed;
  }

  if (payload.icon !== undefined) {
    updateData.icon = payload.icon;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No update fields provided');
  }

  const expertise = await Expertise.findByIdAndUpdate(
    expertiseId,
    updateData,
    { new: true, runValidators: true }
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
