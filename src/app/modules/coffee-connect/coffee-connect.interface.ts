import { Types } from 'mongoose';

export type TCoffeeConnect = {
  title: string;
  description: string;
  image: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  zoomMeetingId?: string;
  zoomMeetingPassword?: string;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  maxParticipants: number;
  participants: Types.ObjectId[];
  isExpired: boolean;
  isDeleted: boolean;
  notified2h: boolean;
  notified10m: boolean;
};
