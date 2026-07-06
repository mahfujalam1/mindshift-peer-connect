import { Schema, model } from 'mongoose';
import { TConversation, TMessage } from './chat.interface';

const conversationSchema = new Schema<TConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    isBlocked: { type: Boolean, default: false },
    isGroup: { type: Boolean, default: false },
    groupName: { type: String, default: null },
  },
  { timestamps: true }
);

const messageSchema = new Schema<TMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    file: { type: String, default: null },
    asset: { type: Schema.Types.ObjectId, ref: 'ChatAsset', default: null },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, status: 1 });

export const Conversation = model<TConversation>('Conversation', conversationSchema);
export const Message = model<TMessage>('Message', messageSchema);
