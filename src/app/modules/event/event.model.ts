import { Schema, model } from 'mongoose';
import { TEvent, TEventRequest } from './event.interface';

const eventSchema = new Schema<TEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    eventType: {
      type: String,
      enum: ['SocialEvent', 'CoffeeConnect', 'LunchAndLearn'],
      required: true,
    },
    isOnline: { type: Boolean, default: false },
    location: { type: String },
    entryRequirements: [{ type: String }],
    maxParticipants: { type: Number, default: 15 },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    zoomMeetingId: { type: String },
    zoomMeetingPassword: { type: String },
    zoomJoinUrl: { type: String },
    zoomStartUrl: { type: String },
    isExpired: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    notified2d: { type: Boolean, default: false },
    notified2h: { type: Boolean, default: false },
    notified10m: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const eventRequestSchema = new Schema<TEventRequest>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    eventType: {
      type: String,
      enum: ['SocialEvent', 'CoffeeConnect', 'LunchAndLearn'],
      required: true,
    },
    maxParticipants: { type: Number, required: true },
    entryRequirements: [{ type: String }],
    isOnline: { type: Boolean, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

export const Event = model<TEvent>('Event', eventSchema);
export const EventRequest = model<TEventRequest>('EventRequest', eventRequestSchema);
