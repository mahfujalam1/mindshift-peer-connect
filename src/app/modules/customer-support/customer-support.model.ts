import { model, Schema } from 'mongoose';
import { TCustomerSupport } from './customer-support.interface';

const customerSupportSchema = new Schema<TCustomerSupport>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requesterName: { type: String, required: true, trim: true },
    requesterEmail: { type: String, required: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    reply: { type: String, trim: true },
    repliedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    repliedAt: { type: Date },
    status: {
      type: String,
      enum: ['Pending', 'Replied', 'Closed'],
      default: 'Pending',
      index: true,
    },
  },
  { timestamps: true }
);

customerSupportSchema.index({ createdAt: -1 });

export const CustomerSupport = model<TCustomerSupport>(
  'CustomerSupport',
  customerSupportSchema
);
