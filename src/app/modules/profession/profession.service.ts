import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { Profession } from './profession.model';
import { TProfession } from './profession.interface';
import QueryBuilder from '../../builder/QueryBuilder';

const createProfession = async (payload: TProfession) => {
  const result = await Profession.create(payload);
  return result;
};

const getAllProfessions = async (query: Record<string, unknown>) => {
  const professionQuery = new QueryBuilder(Profession.find(), query)
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await professionQuery.modelQuery;
  const meta = await professionQuery.countTotal();

  return {
    meta,
    result,
  };
};

const getSingleProfession = async (id: string) => {
  const result = await Profession.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Profession not found');
  }
  return result;
};

const updateProfession = async (id: string, payload: Partial<TProfession>) => {
  const result = await Profession.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Profession not found');
  }
  return result;
};

const deleteProfession = async (id: string) => {
  const result = await Profession.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Profession not found');
  }
  return result;
};

export const ProfessionServices = {
  createProfession,
  getAllProfessions,
  getSingleProfession,
  updateProfession,
  deleteProfession,
};
