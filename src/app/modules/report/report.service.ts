import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { TReport } from './report.interface';
import { Report } from './report.model';
import QueryBuilder from '../../builder/QueryBuilder';
import User from '../user/user-model';
import sendEmail from '../../utilities/sendEmail';
import { sendNotification } from '../../helper/notificationHelper';
import reportStatusEmailBody from '../../mailTemplate/reportStatusEmailBody';

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
    Report.find()
      .populate('reporter', 'fullName email profileImage')
      .populate('reportedUser', 'fullName email profileImage'),
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

const getSingleReportFromDB = async (reportId: string) => {
  const result = await Report.findById(reportId)
    .populate('reporter', 'fullName email profileImage')
    .populate('reportedUser', 'fullName email profileImage');
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Report not found');
  }
  return result;
};

const updateReportStatus = async (reportId: string, status: 'Resolved' | 'Rejected') => {
  // Atomically claim the transition so repeated requests do not send duplicate alerts.
  const result = await Report.findOneAndUpdate(
    { _id: reportId, status: { $ne: status } },
    { $set: { isResolved: status === 'Resolved', status } },
    { new: true, runValidators: true }
  );
  if (!result) {
    const existing = await Report.findById(reportId);
    if (!existing) {
      throw new AppError(httpStatus.NOT_FOUND, 'Report not found');
    }
    return existing;
  }

  const reporterId = result.reporter.toString();
  const title = `Report ${status}`;
  const message = `Your report "${result.title}" has been ${status.toLowerCase()}.`;
  const deliveries = await Promise.allSettled([
    sendNotification(reporterId, title, message, {
      type: 'report', reportId: String(result._id), status,
    }),
    (async () => {
      const reporter = await User.findById(reporterId).select('email fullName').lean();
      if (!reporter?.email) return;
      await sendEmail({
        email: reporter.email,
        subject: title,
        html: reportStatusEmailBody({
          name: reporter.fullName,
          reportTitle: result.title,
          status,
        }),
      });
    })(),
  ]);
  deliveries.forEach((delivery, index) => {
    if (delivery.status === 'rejected') {
      console.error(`Report ${index === 0 ? 'notification' : 'email'} delivery failed:`, delivery.reason);
    }
  });
  return result;
};

const resolveReportInDB = (reportId: string) => updateReportStatus(reportId, 'Resolved');

const rejectReportInDB = (reportId: string) => updateReportStatus(reportId, 'Rejected');

const deleteReportFromDB = async (reportId: string) => {
  const result = await Report.findByIdAndDelete(reportId);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Report not found');
  }
  return result;
};

export const ReportServices = {
  createReportIntoDB,
  getAllReportsFromDB,
  getSingleReportFromDB,
  resolveReportInDB,
  rejectReportInDB,
  deleteReportFromDB,
};
