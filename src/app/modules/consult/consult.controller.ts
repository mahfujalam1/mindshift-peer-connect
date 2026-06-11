import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { ConsultServices } from './consult.service';

const createConsult = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await ConsultServices.createConsultIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Consult post created successfully',
    data: result,
  });
});

const getAllConsults = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  const result = await ConsultServices.getAllConsults(userId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Consult posts retrieved successfully',
    data: result,
  });
});

const getSingleConsult = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const result = await ConsultServices.getSingleConsult(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Consult post details retrieved successfully',
    data: result,
  });
});

const availableToChat = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const result = await ConsultServices.availableToChat(userId, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully shown interest and added to Referral Network',
    data: result,
  });
});

const getInterestedList = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const result = await ConsultServices.getInterestedList(userId, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Interested users retrieved successfully',
    data: result,
  });
});

const connectWithInterestedUser = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { interestedUserId } = req.body;
  const result = await ConsultServices.connectWithInterestedUser(userId, id, interestedUserId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully connected and initiated conversation',
    data: result,
  });
});

const getMyConsults = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await ConsultServices.getMyConsults(userId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My consult posts retrieved successfully',
    data: result,
  });
});

export const ConsultControllers = {
  createConsult,
  getAllConsults,
  getSingleConsult,
  availableToChat,
  getInterestedList,
  connectWithInterestedUser,
  getMyConsults,
};
