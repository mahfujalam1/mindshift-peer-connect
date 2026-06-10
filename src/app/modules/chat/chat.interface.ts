import { Types } from 'mongoose';

export type TConversation = {
  _id?: string;
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
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
  createdAt?: Date;
  updatedAt?: Date;
};
