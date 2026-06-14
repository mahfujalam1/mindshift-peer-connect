import { Types } from 'mongoose';

export type TReport = {
  reporter: Types.ObjectId;
  reportedUser: Types.ObjectId;
  reportType: string;
  title: string;
  description: string;
  isResolved: boolean;
};
