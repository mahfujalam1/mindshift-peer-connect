import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { AppVersionServices } from './app-version.service';
import { TAppPlatform } from './app-version.interface';

const getAppVersions = catchAsync(async (_req, res) => {
  const result = await AppVersionServices.getAppVersions();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'App versions retrieved successfully',
    data: result,
  });
});

const getAppVersionByPlatform = catchAsync(async (req, res) => {
  const result = await AppVersionServices.getAppVersionByPlatform(
    req.params.platform as TAppPlatform
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'App version retrieved successfully',
    data: result,
  });
});

const upsertAppVersions = catchAsync(async (req, res) => {
  const result = await AppVersionServices.upsertAppVersions(req.body.appVersions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'App versions saved successfully',
    data: result,
  });
});

const updateAppVersion = catchAsync(async (req, res) => {
  const result = await AppVersionServices.updateAppVersion(
    req.params.platform as TAppPlatform,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'App version updated successfully',
    data: result,
  });
});

const checkAppVersion = catchAsync(async (req, res) => {
  const result = await AppVersionServices.checkAppVersion(
    req.query as { platform: TAppPlatform; version: string; buildNumber?: string }
  );
  console.log('checkAppVersion result:', result);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'App version checked successfully',
    data: result,
  });
});

export const AppVersionControllers = {
  getAppVersions,
  getAppVersionByPlatform,
  upsertAppVersions,
  updateAppVersion,
  checkAppVersion,
};
