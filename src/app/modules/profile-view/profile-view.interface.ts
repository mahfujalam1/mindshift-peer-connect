import { Types } from "mongoose";

export type TProfileView = {
  viewer: Types.ObjectId;
  target: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};
