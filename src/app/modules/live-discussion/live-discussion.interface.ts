import { Types } from 'mongoose';
import type { TAllowedMessageEmoji } from '../chat/chat.constants';

export type TLiveDiscussion = {
  name: string;
  members: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  limit: number;
};

export type TLiveReplyToSnapshot = {
  _id: Types.ObjectId;
  text: string;
  file?: string | null;
  senderName: string;
  senderId: Types.ObjectId;
};

export type TLiveMessageReaction = {
  user: Types.ObjectId;
  emoji: TAllowedMessageEmoji | string;
  createdAt?: Date;
};

export type TLiveMessage = {
  _id?: string;
  room: Types.ObjectId;
  sender: Types.ObjectId;
  text?: string;
  file?: string | null;
  replyTo?: Types.ObjectId | null;
  replyToSnapshot?: TLiveReplyToSnapshot | null;
  reactions?: TLiveMessageReaction[];
  createdAt?: Date;
  updatedAt?: Date;
};
