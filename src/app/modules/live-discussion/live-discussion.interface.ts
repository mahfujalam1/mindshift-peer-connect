import { Types } from 'mongoose';

export type TLiveDiscussion = {
  name: string;
  members: Types.ObjectId[];
  limit: number;
};

export type TLiveMessage = {
  room: Types.ObjectId;
  sender: Types.ObjectId;
  text?: string;
  file?: string;
};
