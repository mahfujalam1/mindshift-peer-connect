import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { ProfileViewServices } from './profile-view.service';

const getMyProfileViews = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfileViewServices.getMyProfileViews(req.user.id, req.query);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile views retrieved successfully',
    data: result,
  });
});

export const ProfileViewControllers = {
  getMyProfileViews,
};
