import { Schema, model } from 'mongoose';
import { TConsult } from './consult.interface';

const consultSchema = new Schema<TConsult>(
  {
    issue: { type: String, required: true },
    supportNeeded: { type: String, required: true },
    urgency: { type: String, enum: ['Normal', 'Urgent'], default: 'Normal' },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    interestedPeople: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    connectedWith: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['Open', 'Active Now', 'Closed'], default: 'Open' },
  },
  { timestamps: true }
);

export const Consult = model<TConsult>('Consult', consultSchema);
