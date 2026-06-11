import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { TReport } from './report.interface';
import { Report } from './report.model';
import QueryBuilder from '../../builder/QueryBuilder';
import User from '../user/user-model';

const createReportIntoDB = async (reporterId: string, payload: TReport) => {
  const isUserExist = await User.findById(payload.reportedUser);
  if (!isUserExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Reported user not found');
  }

  if (reporterId === payload.reportedUser.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot report yourself');
  }

  const result = await Report.create({
    ...payload,
    reporter: reporterId,
  });
  return result;
};

const getAllReportsFromDB = async (query: Record<string, unknown>) => {
  const reportQuery = new QueryBuilder(
    Report.find().populate('reporter').populate('reportedUser'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reportQuery.modelQuery;
  const meta = await reportQuery.countTotal();

  return {
    meta,
    result,
  };
};

const resolveReportInDB = async (reportId: string) => {
  const result = await Report.findByIdAndUpdate(
    reportId,
    { isResolved: true },
    { new: true }
  );
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Report not found');
  }
  return result;
};

export const ReportServices = {
  createReportIntoDB,
  getAllReportsFromDB,
  resolveReportInDB,
};
