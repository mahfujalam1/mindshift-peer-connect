import { Schema, model } from 'mongoose';
import { TLiveDiscussion, TLiveMessage } from './live-discussion.interface';

const liveDiscussionSchema = new Schema<TLiveDiscussion>(
  {
    name: { type: String, required: true, unique: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'LiveMessage',
      default: null,
    },
    limit: { type: Number, default: 50 },
  },
  {
    timestamps: true,
  }
);

const liveMessageSchema = new Schema<TLiveMessage>(
  {
    room: { type: Schema.Types.ObjectId, ref: 'LiveDiscussion', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    file: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

export const LiveDiscussion = model<TLiveDiscussion>('LiveDiscussion', liveDiscussionSchema);
export const LiveMessage = model<TLiveMessage>('LiveMessage', liveMessageSchema);
