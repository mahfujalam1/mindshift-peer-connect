import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { GoverningBody } from './governingBody.model';
import { TGoverningBody } from './governingBody.interface';
import QueryBuilder from '../../builder/QueryBuilder';

const createGoverningBody = async (payload: TGoverningBody) => {
  const result = await GoverningBody.create(payload);
  return result;
};

const getAllGoverningBodies = async (query: Record<string, unknown>) => {
  const governingBodyQuery = new QueryBuilder(
    GoverningBody.find().populate('profession'),
    query
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

const updateGoverningBody = async (id: string, payload: Partial<TGoverningBody>) => {
  const result = await GoverningBody.findByIdAndUpdate(id, payload, {
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
};
