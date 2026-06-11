import { Schema, model } from 'mongoose';
import { TReport } from './report.interface';

const reportSchema = new Schema<TReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    isResolved: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const Report = model<TReport>('Report', reportSchema);
