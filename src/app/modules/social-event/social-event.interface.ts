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
  maxParticipants: number;
  participants: Types.ObjectId[];
  isExpired: boolean;
  isDeleted: boolean;
  notified2d: boolean;
};
