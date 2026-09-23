import { Types } from 'mongoose';
import type { TAllowedMessageEmoji } from './chat.constants';

export type TConversation = {
  _id?: string;
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  isBlocked?: boolean;
  isGroup?: boolean;
  groupName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TReplyToSnapshot = {
  _id: Types.ObjectId;
  text: string;
  file?: string | null;
  senderName: string;
  senderId: Types.ObjectId;
};

export type TMessageReaction = {
  user: Types.ObjectId;
  emoji: TAllowedMessageEmoji | string;
  createdAt?: Date;
};

export type TMessage = {
  _id?: string;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  text: string;
  file?: string;
  asset?: Types.ObjectId;
  status: 'sent' | 'delivered' | 'seen';
  isEdited?: boolean;
  replyTo?: Types.ObjectId | null;
  replyToSnapshot?: TReplyToSnapshot | null;
  reactions?: TMessageReaction[];
  createdAt?: Date;
  updatedAt?: Date;
};
