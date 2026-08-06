import { Schema, model } from 'mongoose';
import { TProfileView } from './profile-view.interface';

const profileViewSchema = new Schema<TProfileView>(
  {
    viewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    target: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index so we can use upsert to keep only the latest view
profileViewSchema.index({ target: 1, viewer: 1 }, { unique: true });

export const ProfileView = model<TProfileView>('ProfileView', profileViewSchema);
