import { Schema, model } from 'mongoose';
import { TConsult } from './consult.interface';

const consultSchema = new Schema<TConsult>(
  {
    issue: { type: String, required: true },
    supportNeeded: { type: String, required: true },
    urgency: { type: String, enum: ['Normal', 'Urgent'], default: 'Normal' },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    interestedPeople: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    connectedWith: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['Open', 'Active Now', 'Closed'], default: 'Open' },
  },
  { timestamps: true }
);

consultSchema.index({ location: '2dsphere' });
consultSchema.index({ city: 1, country: 1 });

export const Consult = model<TConsult>('Consult', consultSchema);
