/* eslint-disable @typescript-eslint/no-unused-vars */
import { UserServices } from "./user-service";
import catchAsync from "../../utilities/catchAsync";
import sendResponse from "../../utilities/sendResponse";
import httpStatus from "http-status";
import { getUploadedFileUrl } from "../../helper/multer-s3-uploader";

export const createUser = catchAsync(async (req, res, next) => {
  const userData = req.body;

  const result = await UserServices.createUserIntoDB(userData);

  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "No Data Found",
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User registered successfully",
    data: result,
  });
});


const verifyCode = catchAsync(async (req, res) => {
  const result = await UserServices.verifyCode(
    req?.body?.email,
    req?.body?.verifyCode
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully verified your account with email',
    data: result,
  });
});



const resendVerifyCode = catchAsync(async (req, res) => {
  const result = await UserServices.resendVerifyCode(req?.body?.email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Verify code send to your email inbox',
    data: result,
  });
});


const getMyProfile = catchAsync(async (req, res) => {
  const result = await UserServices.getMyProfile(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved your data',
    data: result,
  });
});



const updateProfile = catchAsync(async (req, res) => {
  const { files } = req;
  const payload = req.body;

  // Parse location if it's sent as a string (common in form-data)
  if (typeof payload.location === 'string') {
    payload.location = JSON.parse(payload.location);
  }

  let imageUrl;
  if (files && !Array.isArray(files)) {
    const profileImage = files.profileImage?.[0] || files.profile_image?.[0];
    imageUrl = getUploadedFileUrl(profileImage);
  }
  const token = req.user;
  const result = await UserServices.updateProfile(token?.id, imageUrl, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully update your profile',
    data: result,
  });
});



const blockUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await UserServices.blockUser(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully blocked this User',
    data: result
  })
})


const getSingleUser = catchAsync(async (req, res) => {
  const result = await UserServices.getSingleUser(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User retrieved successfully',
    data: result,
  });
});


const getAllUser = catchAsync(async (req, res) => {
  const result = await UserServices.getAllUser(req?.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'users retrieved successfully',
    data: result,
  });
});



const getMyReferralNetwork = catchAsync(async (req, res) => {
  const result = await UserServices.getMyReferralNetwork(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My Referral Network retrieved successfully',
    data: result,
  });
});

const getAddedMeToReferralNetwork = catchAsync(async (req, res) => {
  const result = await UserServices.getAddedMeToReferralNetwork(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Added Me To Their Referral Network retrieved successfully',
    data: result,
  });
});

const addToReferralNetwork = catchAsync(async (req, res) => {
  const { targetUserId } = req.params;
  const result = await UserServices.addToReferralNetwork(req.user.id, targetUserId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User added to your referral network successfully',
    data: result,
  });
});

const getBrowsableUsersForReferral = catchAsync(async (req, res) => {
  const result = await UserServices.getBrowsableUsersForReferral(req.user.id, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users retrieved successfully',
    data: result,
  });
});

export const UserControllers = {
  createUser,
  verifyCode,
  resendVerifyCode,
  getMyProfile,
  updateProfile,
  blockUser,
  getSingleUser,
  getAllUser,
  getMyReferralNetwork,
  getAddedMeToReferralNetwork,
  addToReferralNetwork,
  getBrowsableUsersForReferral,
};
