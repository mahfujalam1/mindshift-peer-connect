import { Model, Types } from 'mongoose';
import { USER_ROLE } from './user-constant';
import { TProfession } from '../profession/profession.interface';
import { TGoverningBody } from '../governingBody/governingBody.interface';

// Define Location type for geospatial features
export type TLocation = {
  address?: string;
  type?: 'Point';
  coordinates?: [number, number]; // [longitude, latitude]
  radiusInKm?: number;
};

// Define the User type
export type TUser = {
  _id?: string
  fullName: string;
  email: string;
  profileImage: string;
  profession: Types.ObjectId | TProfession;
  licenseNo: string;
  governingBody: Types.ObjectId | TGoverningBody;
  phone?: string;
  bio?: string;
  country: string;
  city: string;
  location: TLocation;
  role: 'admin' | 'user';
  password: string;
  isBlocked: boolean;
  verifyCode: number;
  passwordChangedAt?: Date
  resetCode: number;
  isVerified: boolean;
  isResetVerified: boolean;
  codeExpireIn: Date;
  isActive: boolean;
  isDeleted: boolean;
  playerIds: string[];
  isPremium: boolean;
};


// Define the UserModel interface, which includes static methods
export interface UserModel extends Model<TUser> {
  isPasswordMatched(plainPassword: string, hashPassword: string): Promise<TUser>;
  isJWTIssuedBeforePasswordChange(
    passwordChangeTimeStamp: Date,
    jwtIssuedTimeStamp: number
  ): Promise<boolean>;
}

export type TUserRole = keyof typeof USER_ROLE;
