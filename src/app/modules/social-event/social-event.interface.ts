import { Types } from 'mongoose';

export type TSocialEvent = {
  title: string;
  description: string;
  image: string;
  date: string; // YYYY-MM-DD
  location: string;
  entryRequirements: string[];
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
  status: "Accepted" | "Rejected" | "Pending";
  startAt: Date;
  endAt: Date;
  maxParticipants: number;
  participants: Types.ObjectId[];
  isExpired: boolean;
  isDeleted: boolean;
  notified2d: boolean;
};
