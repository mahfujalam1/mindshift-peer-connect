import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { GoverningBody } from './governingBody.model';
import { Types } from 'mongoose';
import { TGoverningBody } from './governingBody.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import { Profession } from '../profession/profession.model';

type TGoverningBodyPayload = {
  name: string;
  parentId?: string;
};

const validateProfessionExists = async (professionId: string) => {
  const profession = await Profession.findById(professionId);
  if (!profession) {
    throw new AppError(httpStatus.NOT_FOUND, 'Profession not found');
  }
  return profession;
};

const validateGoverningBodyInProfession = async (
  governingBodyId: string,
  professionId: string
) => {
  const governingBody = await GoverningBody.findById(governingBodyId);
  if (!governingBody) {
    throw new AppError(httpStatus.NOT_FOUND, 'Governing Body not found');
  }

  if (governingBody.profession.toString() !== professionId.toString()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The governing body is not included in the profession'
    );
  }

  return governingBody;
};

const createGoverningBody = async (payload: TGoverningBodyPayload) => {
  await validateProfessionExists(payload.parentId!);

  const result = await GoverningBody.create({
    name: payload.name,
    profession: payload.parentId,
  });
  return result;
};

const getAllGoverningBodies = async (query: Record<string, unknown>) => {
  const { parentId, ...restQuery } = query;
  const professionFilter = parentId ?? restQuery.profession;

  const governingBodyQuery = new QueryBuilder(
    GoverningBody.find().populate('profession'),
    {
      ...restQuery,
      ...(professionFilter ? { profession: professionFilter } : {}),
    }
  )
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await governingBodyQuery.modelQuery;
  const meta = await governingBodyQuery.countTotal();

  return {
    meta,
    result,
  };
};

const getSingleGoverningBody = async (id: string) => {
  const result = await GoverningBody.findById(id).populate('profession');
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Governing Body not found');
  }
  return result;
};

const getGoverningBodiesByProfession = async (professionId: string) => {
  const result = await GoverningBody.find({ profession: professionId }).populate('profession');
  return result;
};

const updateGoverningBody = async (
  id: string,
  payload: Partial<TGoverningBodyPayload>
) => {
  const updateData: Partial<TGoverningBody> = {};

  if (payload.name) {
    updateData.name = payload.name;
  }

  if (payload.parentId) {
    await validateProfessionExists(payload.parentId);
    updateData.profession = new Types.ObjectId(payload.parentId);
  }

  const result = await GoverningBody.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Governing Body not found');
  }
  return result;
};

const deleteGoverningBody = async (id: string) => {
  const result = await GoverningBody.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Governing Body not found');
  }
  return result;
};

export const GoverningBodyServices = {
  createGoverningBody,
  getAllGoverningBodies,
  getSingleGoverningBody,
  getGoverningBodiesByProfession,
  updateGoverningBody,
  deleteGoverningBody,
  validateGoverningBodyInProfession,
};
