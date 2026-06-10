/* eslint-disable @typescript-eslint/no-unused-vars */
import { AuthServices } from "./auth-service";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import httpStatus from "http-status";

const logInUser = catchAsync(async (req, res, next) => {
  const body = req.body;

  const result = await AuthServices.logInUserIntoDB(body);

  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "No Data Found",
      data: [],
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'login successfully',
    data: result,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const email = req.body.email;
  const result = await AuthServices.forgetPassword(email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password reset code send to the email',
    data: result,
  });
});


const changePassword = catchAsync(async (req, res) => {
  console.log("===========", req.body);
  const { ...passwordData } = req.body;
  const result = await AuthServices.changePasswordIntoDB(
    req.user,
    passwordData
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password is updated successfully',
    data: result,
  });
});


const resetPassword = catchAsync(async (req, res) => {

  const result = await AuthServices.resetPassword(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password reset successfully',
    data: result,
  });
});


const verifyResetOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyResetOtp(
    req.body.email,
    req.body.resetCode
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reset code verified',
    data: result,
  });
});


const resendResetCode = catchAsync(async (req, res) => {
  const result = await AuthServices.resendResetCode(req?.body.email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reset code resend successfully',
    data: result,
  });
});


// const resendVerifyCode = catchAsync(async (req, res) => {
//   const result = await AuthServices.resendVerifyCode(req?.body.email);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: 'Verify code resend successfully',
//     data: result,
//   });
// });


const deleteUser = catchAsync(async (req, res) => {
  const result = await AuthServices.deleteUser(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Delete User successfully',
    data: result,
  });
});

export const AuthControllers = {
  logInUser,
  forgetPassword,
  changePassword,
  resendResetCode,
  // resendVerifyCode,
  resetPassword,
  verifyResetOtp,
  deleteUser
};
