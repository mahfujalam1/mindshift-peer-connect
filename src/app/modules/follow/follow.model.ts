import { Schema, model } from 'mongoose';
import { TFollow } from './follow.interface';

const followSchema = new Schema<TFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    following: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ follower: 1, createdAt: -1 });
followSchema.index({ following: 1, createdAt: -1 });

export const Follow = model<TFollow>('Follow', followSchema);
