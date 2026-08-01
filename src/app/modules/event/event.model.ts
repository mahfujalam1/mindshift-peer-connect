import { Schema, model } from 'mongoose';
import { TEventRequest } from './event.interface';


const eventRequestSchema = new Schema<TEventRequest>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    timezone: { type: String, required: true },
    eventType: {
      type: String,
      enum: ['SocialEvent', 'CoffeeConnect', 'LunchAndLearn'],
      required: true,
    },
    maxParticipants: { type: Number, required: true },
    entryRequirements: [{ type: String }],
    isOnline: { type: Boolean, required: true },
    location: { type: String },
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

export const EventRequest = model<TEventRequest>('EventRequest', eventRequestSchema);
