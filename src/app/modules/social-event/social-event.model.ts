import { Schema, model } from 'mongoose';
import { TSocialEvent } from './social-event.interface';

const socialEventSchema = new Schema<TSocialEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    date: { type: String, required: true },
    location: { type: String, required: true },
    entryRequirements: [{ type: String }],
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    timezone: { type: String, required: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["Accepted", "Rejected", "Pending"],
      default: "Pending"
    },
    maxParticipants: { type: Number, default: 15 },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isExpired: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    notified2d: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const SocialEvent = model<TSocialEvent>('SocialEvent', socialEventSchema);
