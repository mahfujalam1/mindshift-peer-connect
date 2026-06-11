import { Types } from 'mongoose';
export type TConsult = {
  _id?: string;
  issue: string;
  supportNeeded: string;
  urgency: 'Normal' | 'Urgent';
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  author: Types.ObjectId;
  interestedPeople: Types.ObjectId[];
  connectedWith?: Types.ObjectId;
  status: 'Open' | 'Active Now' | 'Closed';
  createdAt?: Date;
  updatedAt?: Date;
};
