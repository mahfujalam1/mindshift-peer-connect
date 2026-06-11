import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { ReportServices } from './report.service';

const createReport = catchAsync(async (req: Request, res: Response) => {
  const reporterId = req.user.id;
  const result = await ReportServices.createReportIntoDB(reporterId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Report submitted successfully',
    data: result,
  });
});

const getAllReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportServices.getAllReportsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reports retrieved successfully',
    data: result.result,
  });
});

const resolveReport = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReportServices.resolveReportInDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Report resolved successfully',
    data: result,
  });
});

export const ReportControllers = {
  createReport,
  getAllReports,
  resolveReport,
};
