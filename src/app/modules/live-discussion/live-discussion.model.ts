import { Schema, model } from 'mongoose';
import { TLiveDiscussion, TLiveMessage } from './live-discussion.interface';
import { ALLOWED_MESSAGE_EMOJIS } from '../chat/chat.constants';

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

const liveReplyToSnapshotSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    text: { type: String, default: '' },
    file: { type: String, default: null },
    senderName: { type: String, default: '' },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const liveReactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: {
      type: String,
      required: true,
      enum: ALLOWED_MESSAGE_EMOJIS,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const liveMessageSchema = new Schema<TLiveMessage>(
  {
    room: { type: Schema.Types.ObjectId, ref: 'LiveDiscussion', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    file: { type: String, default: null },
    replyTo: { type: Schema.Types.ObjectId, ref: 'LiveMessage', default: null },
    replyToSnapshot: { type: liveReplyToSnapshotSchema, default: null },
    reactions: { type: [liveReactionSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

liveMessageSchema.index({ room: 1, createdAt: 1 });
liveMessageSchema.index({ room: 1, createdAt: 1, _id: 1 });

export const LiveDiscussion = model<TLiveDiscussion>('LiveDiscussion', liveDiscussionSchema);
export const LiveMessage = model<TLiveMessage>('LiveMessage', liveMessageSchema);
