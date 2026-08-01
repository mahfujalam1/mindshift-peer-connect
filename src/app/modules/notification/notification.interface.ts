import { Types } from 'mongoose';

export interface INotification {
    title: string;
    message: string;
    seen: boolean;
    receiver: string;
    seenBy: Types.ObjectId[];
    deleteBy: Types.ObjectId[];
}
