
import config from "../../config";
import bcrypt from 'bcrypt';
import sendEmail from "../../utilities/sendEmail";
import resetPasswordEmailBody from "../../mailTemplate/resetPasswordEmailBody";
import User from "../user/user-model";
import AppError from "../../error/appError";
import httpStatus from "http-status";
import { TUserRole } from "../user/user-interface";
import { createToken } from "../user/user.utils";
import { TLogin } from "./auth-interface";
import { JwtPayload } from "jsonwebtoken";
import registrationSuccessEmailBody from "../../mailTemplate/registerSucessEmail";

const generateVerifyCode = (): number => {
  return Math.floor(100000 + Math.random() * 900000);
};

const logInUserIntoDB = async (payload: TLogin & { playerId?: string }) => {
  // Find the user by email
  const user = await User.findOne({ email: payload.email });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user does not exist');
  }

  // Check if the user is deleted
  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is already deleted');
  }

  // Generate a new verification code
  const verifyCode = generateVerifyCode();

  // Check if the user is blocked
  if (user.isBlocked) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked');
  }

  // Check if the provided password matches the stored hashed password
  if (!(await User.isPasswordMatched(payload?.password, user?.password))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Password does not match');
  }

  if (!user.isVerified || !user.isActive) {
    user.verifyCode = verifyCode;
    await User.findByIdAndUpdate(user._id, { verifyCode: verifyCode });

    sendEmail({
      email: payload.email,
      subject: 'Activate Your Account',
      html: registrationSuccessEmailBody(user.fullName, verifyCode),
    });

    return { email_verification: false };
  }

  // Handle playerId update (same logic as your first example)
  if (payload.playerId) {
    const currentPlayerIds = user.playerIds || [];

    // If already exists, remove it first (to avoid duplicates)
    const filtered = currentPlayerIds.filter(
      (id) => id !== payload.playerId
    );

    // Add the new one to the end
    filtered.push(payload.playerId);

    // If length > 3, remove from beginning
    if (filtered.length > 3) {
      filtered.shift();
    }

    await User.findByIdAndUpdate(user._id, { playerIds: filtered });
  }

  // Create the JWT payload for generating tokens
  const jwtPayload = {
    id: String(user._id),
    email: user.email,
    role: user.role as TUserRole,
  };

  // Create access and refresh tokens
  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_screet as string,
    config.jwt_access_expires_in
  );
  const refreshToken = createToken(
    jwtPayload,
    config.jwt_access_screet as string,
    config.jwt_access_expires_in
  );

  return {
    id: user._id,
    accessToken,
    refreshToken,
  };
};




const changePasswordIntoDB = async (
  userData: JwtPayload,
  payload: {
    oldPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }
) => {
  if (payload.newPassword !== payload.confirmNewPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Password and confirm password doesn't match"
    );
  }

  const user = await User.findById(userData.id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user does not exist');
  }
  if (user.isDeleted) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This user is already deleted'
    );
  }
  if (user.isBlocked) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked');
  }

  // Debugging: Log password comparison
  console.log('Comparing Passwords...');
  console.log('Old Password (Plain):', payload.oldPassword);
  console.log('Stored Password Hash:', user.password);

  const isMatched = await User.isPasswordMatched(payload.oldPassword, user.password);

  if (!isMatched) {
    throw new AppError(httpStatus.FORBIDDEN, 'Password does not match');
  }

  // Update the user's password and let the pre-save hook handle hashing
  user.password = payload.newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  // Create new tokens
  const jwtPayload = {
    id: String(user._id),
    email: user.email,
    role: user.role as TUserRole,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_screet as string,
    config.jwt_access_expires_in
  );
  const refreshToken = createToken(
    jwtPayload,
    config.jwt_access_screet as string,
    config.jwt_access_expires_in
  );

  return {
    accessToken,
    refreshToken,
  };
};



// forgot password
const forgetPassword = async (email: string) => {
  const user = await User.findOne({ email: email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user does not exist');
  }
  if (user.isDeleted) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This user is already deleted'
    );
  }
  if (user.isBlocked) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked');
  }

  const resetCode = generateVerifyCode();
  await User.findOneAndUpdate(
    { email: email },
    {
      resetCode: resetCode,
      isResetVerified: false,
      codeExpireIn: new Date(Date.now() + 15 * 60000),
    }
  );

  sendEmail({
    email: user.email,
    subject: 'Reset password code',
    html: resetPasswordEmailBody('Dear', resetCode),
  });

  return null;
};


const verifyResetOtp = async (email: string, resetCode: number) => {
  const user = await User.findOne({ email: email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user does not exist');
  }
  if (user.isDeleted) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This user is already deleted'
    );
  }
  if (user.isBlocked) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked');
  }

  if (user.codeExpireIn < new Date(Date.now())) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Reset code is expire');
  }
  if (user.resetCode !== Number(resetCode)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Reset code is invalid');
  }
  await User.findOneAndUpdate(
    { email: email },
    { isResetVerified: true },
    { new: true, runValidators: true }
  );
  return null;
};

// reset password
const resetPassword = async (payload: {
  email: string;
  password: string;
  confirmPassword: string;
}) => {
  if (payload.password !== payload.confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Password and confirm password doesn't match"
    );
  }
  const user = await User.findOne({ email: payload.email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user does not exist');
  }
  if (!user.isResetVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You need to verify reset code before reset password'
    );
  }

  if (user.isDeleted) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This user is already deleted'
    );
  }
  if (user.isBlocked) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked');
  }

  // Update the password and let the pre-save hook handle hashing
  user.password = payload.password;
  user.passwordChangedAt = new Date();
  user.isResetVerified = false; // Reset verification status after successful reset
  await user.save();
  const jwtPayload = {
    id: String(user!._id),
    email: user!.email,
    role: user!.role as TUserRole,
  };
  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_screet as string,
    config.jwt_access_expires_in
  );
  const refreshToken = createToken(
    jwtPayload,
    config.jwt_access_screet as string,
    config.jwt_access_expires_in
  );

  return { accessToken, refreshToken };
};

const resendResetCode = async (email: string) => {
  const user = await User.findOne({ email: email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user does not exist');
  }
  if (user.isDeleted) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This user is already deleted'
    );
  }
  if (user.isBlocked) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked');
  }

  const resetCode = generateVerifyCode();
  await User.findOneAndUpdate(
    { email: email },
    {
      resetCode: resetCode,
      isResetVerified: false,
      codeExpireIn: new Date(Date.now() + 15 * 60000),
    }
  );
  sendEmail({
    email: user.email,
    subject: 'Reset password code',
    html: resetPasswordEmailBody('Dear', resetCode),
  });

  return null;
};


const resendVerifyCode = async (email: string) => {
  const user = await User.findOne({ email: email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user does not exist');
  }
  if (user.isDeleted) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This user is already deleted'
    );
  }
  if (user.isBlocked) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked');
  }

  const verifyCode = generateVerifyCode();
  await User.findOneAndUpdate(
    { email: email },
    {
      verifyCode: verifyCode,
      isVerified: false,
      codeExpireIn: new Date(Date.now() + 5 * 60000),
    }
  );
  sendEmail({
    email: user.email,
    subject: 'Reset password code',
    html: resetPasswordEmailBody('Dear', verifyCode),
  });

  return null;
};


const deleteUser = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User Not Found!");
  }

  const result = await User.findByIdAndDelete(userId);

  if (!result) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete user.");
  }

  return result;
};

export const AuthServices = {
  logInUserIntoDB,
  forgetPassword,
  resendResetCode,
  resendVerifyCode,
  resetPassword,
  verifyResetOtp,
  changePasswordIntoDB,
  deleteUser
};
