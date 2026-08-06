import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { TUserRole } from '../user/user-interface';
import { CustomerSupportServices } from './customer-support.service';

const createTicket = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerSupportServices.createTicket(
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Customer support query submitted successfully',
    data: result,
  });
});

const getAllTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerSupportServices.getAllTickets(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer support tickets retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getMyTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerSupportServices.getMyTickets(
    req.user.id,
    req.query
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My customer support tickets retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getTicketById = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerSupportServices.getTicketById(
    req.params.id,
    req.user.id,
    req.user.role as TUserRole
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer support ticket retrieved successfully',
    data: result,
  });
});

const updateMyTicket = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerSupportServices.updateMyTicket(
    req.params.id,
    req.user.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer support ticket updated successfully',
    data: result,
  });
});

const replyToTicket = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerSupportServices.replyToTicket(
    req.params.id,
    req.user.id,
    req.body.reply
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer support reply sent successfully',
    data: result,
  });
});

const closeTicket = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerSupportServices.closeTicket(
    req.params.id,
    req.user.id,
    req.user.role as TUserRole
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer support ticket closed successfully',
    data: result,
  });
});

const deleteTicket = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerSupportServices.deleteTicket(
    req.params.id,
    req.user.id,
    req.user.role as TUserRole
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer support ticket deleted successfully',
    data: result,
  });
});

export const CustomerSupportControllers = {
  createTicket,
  getAllTickets,
  getMyTickets,
  getTicketById,
  updateMyTicket,
  replyToTicket,
  closeTicket,
  deleteTicket,
};
