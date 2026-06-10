/* eslint-disable no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import { TUserRole } from '../modules/user/user-interface';
import catchAsync from '../utilities/catchAsync';
import AppError from '../error/appError';
import httpStatus from 'http-status';
import config from '../config';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User from '../modules/user/user-model';



const auth = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // check if the token is sent from client -----
    const token = req?.headers?.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        config.jwt_access_screet as string,
      ) as JwtPayload;
    } catch (err) {
      console.log(err)
      throw new AppError(httpStatus.UNAUTHORIZED, 'Token is expired');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, role } = decoded;

    if (!decoded) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Token is expired');
    }
    // get the user if that here ---------
    const user = await User.findById(id);
    
    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'This user does not exist');
    }
    if (user.isDeleted) {
      throw new AppError(httpStatus.FORBIDDEN, 'This user is already deleted');
    }
    if (user.isBlocked) {
      throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked');
    }
    if (!user?.isVerified) {
      throw new AppError(httpStatus.BAD_REQUEST, 'You are not verified user');
    }
    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Your are not authorized');
    }
    // add those properties in req
    req.user = decoded as JwtPayload;
    next();
  });
};

export default auth;
