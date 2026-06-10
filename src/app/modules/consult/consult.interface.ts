import { Types } from 'mongoose';

export type TConsult = {
  _id?: string;
  issue: string;
  supportNeeded: string;
  urgency: 'Normal' | 'Urgent';
  author: Types.ObjectId;
  interestedPeople: Types.ObjectId[];
  connectedWith?: Types.ObjectId;
  status: 'Open' | 'Active Now' | 'Closed';
  createdAt?: Date;
  updatedAt?: Date;
};
