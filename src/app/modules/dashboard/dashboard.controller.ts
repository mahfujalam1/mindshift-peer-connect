import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import { DashboardServices } from "./dashboard.service";

const getOverviewStats = catchAsync(async (req: Request, res: Response) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const result = await DashboardServices.getOverviewStats(year);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Overview stats retrieved successfully",
    data: result
  });
});

const getTherapistsList = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardServices.getTherapistsList(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Therapists list retrieved successfully",
    data: result
  });
});

const updateTherapistBlockStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await DashboardServices.updateTherapistBlockStatus(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Therapist successfully ${result?.isBlocked ? "blocked" : "unblocked"}`,
    data: result
  });
});

const verifyTherapist = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await DashboardServices.verifyTherapist(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Therapist verified successfully",
    data: result
  });
});

const getEventsList = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardServices.getEventsList(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events list retrieved successfully",
    data: result
  });
});

const updateEventRequestStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await DashboardServices.updateEventRequestStatus(id, status);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Event request successfully ${status.toLowerCase()}`,
    data: result
  });
});

const deleteEventRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await DashboardServices.deleteEventRequest(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event request deleted successfully",
    data: result
  });
});

const getReportsList = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardServices.getReportsList(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reports list retrieved successfully",
    data: result
  });
});

const updateReportStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await DashboardServices.updateReportStatus(id, status);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Report successfully ${status.toLowerCase()}`,
    data: result
  });
});

const deleteReport = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await DashboardServices.deleteReport(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Report deleted successfully",
    data: result
  });
});

const getChatsList = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardServices.getChatsList(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Chats list retrieved successfully",
    data: result
  });
});

const updateChatBlockStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isBlocked } = req.body;
  const result = await DashboardServices.updateChatBlockStatus(id, isBlocked);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Chat room successfully ${isBlocked ? "blocked" : "unblocked"}`,
    data: result
  });
});

export const DashboardControllers = {
  getOverviewStats,
  getTherapistsList,
  updateTherapistBlockStatus,
  verifyTherapist,
  getEventsList,
  updateEventRequestStatus,
  deleteEventRequest,
  getReportsList,
  updateReportStatus,
  deleteReport,
  getChatsList,
  updateChatBlockStatus
};
