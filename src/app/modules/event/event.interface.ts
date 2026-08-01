import { Types } from 'mongoose';

export type TEventType = 'SocialEvent' | 'CoffeeConnect' | 'LunchAndLearn';

export type TEvent = {
  title: string;
  description: string;
  image: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
  startAt: Date;
  endAt: Date;
  eventType: TEventType;
  isOnline: boolean;
  location?: string; // For offline events
  entryRequirements?: string[]; // Specifically for SocialEvent
  maxParticipants: number;
  participants: Types.ObjectId[];
  zoomMeetingId?: string;
  zoomMeetingPassword?: string;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  isExpired: boolean;
  isDeleted: boolean;
  notified2d?: boolean; // For SocialEvent (offline)
  notified2h?: boolean; // For Online events
  notified10m?: boolean; // For Online events
};

export type TEventRequest = {
  user: Types.ObjectId;
  title: string;
  description: string;
  image: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  eventType: TEventType;
  maxParticipants: number;
  entryRequirements?: string[];
  isOnline: boolean;
  location?: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
};
