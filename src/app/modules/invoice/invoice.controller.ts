import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import { InvoiceService } from "./invoice.service";

// RevenueCat webhook handler
const revenueCatWebhook = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const result = await InvoiceService.handleRevenueCatWebhook(req.body, authHeader);

  res.status(httpStatus.OK).json(result);
});

// Get all invoices for the currently logged-in user
const getMyInvoices = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await InvoiceService.getMyInvoices(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Invoices retrieved successfully",
    data: result,
  });
});

// Get a single invoice by ID (user can only access their own)
const getSingleInvoice = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const result = await InvoiceService.getSingleInvoice(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Invoice retrieved successfully",
    data: result,
  });
});

// Admin: get all invoices across all users
const getAllInvoices = catchAsync(async (req: Request, res: Response) => {
  const result = await InvoiceService.getAllInvoices();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All invoices retrieved successfully",
    data: result,
  });
});

// Cancel a pending invoice (cannot cancel a paid invoice)
const cancelInvoice = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await InvoiceService.cancelInvoice(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Invoice cancelled successfully",
    data: result,
  });
});

export const InvoiceController = {
  revenueCatWebhook,
  getMyInvoices,
  getSingleInvoice,
  getAllInvoices,
  cancelInvoice,
};
