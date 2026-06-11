import { Schema, model } from 'mongoose';
import { TLunchAndLearn } from './lunch-and-learn.interface';

const lunchAndLearnSchema = new Schema<TLunchAndLearn>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    zoomMeetingId: { type: String },
    zoomMeetingPassword: { type: String },
    zoomJoinUrl: { type: String },
    zoomStartUrl: { type: String },
    maxParticipants: { type: Number, default: 15 },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isExpired: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    notified2h: { type: Boolean, default: false },
    notified10m: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const LunchAndLearn = model<TLunchAndLearn>('LunchAndLearn', lunchAndLearnSchema);
