import Expertise from './expertise.model';
import { Types } from 'mongoose';
import httpStatus from 'http-status';
import AppError from '../../error/appError';
import User from '../user/user-model';

/**
 * Create a new expertise entry for a user. Supports selecting Admin-created expertise ObjectIds.
 */
export const createExpertise = async (userId: string, payload: any) => {
  const expertisesToAdd: { name: string; icon?: string }[] = [];
  const iconToUse = payload?.icon || null;

  let input = payload;
  if (typeof payload === 'string') {
    input = { name: payload };
  }

  const rawIds = input?.expertiseIds || input?.expertises || (Array.isArray(input?.name) ? input.name : null);
  if (rawIds && Array.isArray(rawIds) && rawIds.length > 0) {
    const validObjectIds = rawIds.filter((id: any) => typeof id === 'string' && Types.ObjectId.isValid(id));
    if (validObjectIds.length > 0) {
      const adminExpertises = await Expertise.find({ _id: { $in: validObjectIds } });
      adminExpertises.forEach((exp) => expertisesToAdd.push({ name: exp.name, icon: exp.icon || iconToUse }));
    }
  }

  if (input?.expertiseId && Types.ObjectId.isValid(input.expertiseId)) {
    const adminExp = await Expertise.findById(input.expertiseId);
    if (adminExp) {
      expertisesToAdd.push({ name: adminExp.name, icon: adminExp.icon || iconToUse });
    } else {
      throw new AppError(httpStatus.NOT_FOUND, 'Expertise not found');
    }
  }

  if (input?.name && typeof input.name === 'string') {
    if (Types.ObjectId.isValid(input.name)) {
      const adminExp = await Expertise.findById(input.name);
      if (adminExp) {
        expertisesToAdd.push({ name: adminExp.name, icon: adminExp.icon || iconToUse });
      } else {
        expertisesToAdd.push({ name: input.name, icon: iconToUse });
      }
    } else {
      expertisesToAdd.push({ name: input.name, icon: iconToUse });
    }
  }

  if (expertisesToAdd.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please select valid admin expertise ObjectId(s) or provide expertise name'
    );
  }

  const createdExpertises = [];
  for (const exp of expertisesToAdd) {
    const existing = await Expertise.findOne({
      user: new Types.ObjectId(userId),
      name: { $regex: `^${exp.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });

    if (!existing) {
      const created = await Expertise.create({
        user: new Types.ObjectId(userId),
        name: exp.name,
        icon: exp.icon,
      });
      createdExpertises.push(created);
    } else {
      createdExpertises.push(existing);
    }
  }

  return Array.isArray(rawIds) && rawIds.length > 1 ? createdExpertises : createdExpertises[0];
};

/**
 * Retrieve all expertise entries.
 */
export const getAllExpertise = async () => {
  return Expertise.find();
};

/**
 * Retrieve only the expertise filters created by admins.
 */
export const getAdminExpertise = async () => {
  const adminIds = await User.find({ role: 'admin', isDeleted: false }).distinct(
    '_id'
  );

  return Expertise.find({ user: { $in: adminIds } })
    .select('_id name icon')
    .collation({ locale: 'en', strength: 2 })
    .sort({ name: 1 })
    .lean();
};

/**
 * Retrieve all expertise entries of a user.
 */
export const getMyExpertise = async (userId: string) => {
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
