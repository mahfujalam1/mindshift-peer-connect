import { Schema, model } from 'mongoose';
import { TChatAsset } from './chat-asset.interface';

const chatAssetSchema = new Schema<TChatAsset>(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    type: { type: String, enum: ['gif', 'image'], required: true },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

chatAssetSchema.index({ label: 'text', tags: 'text' });
chatAssetSchema.index({ type: 1, isActive: 1 });
chatAssetSchema.index({ tags: 1 });

export const ChatAsset = model<TChatAsset>('ChatAsset', chatAssetSchema);
