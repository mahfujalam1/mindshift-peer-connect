import { Types } from 'mongoose';
import type { PushNotificationType } from '../../helper/sendPushNotification';

export interface INotification {
    title: string;
    message: string;
    type: PushNotificationType;
    seen: boolean;
    receiver: string;
    seenBy: Types.ObjectId[];
    deleteBy: Types.ObjectId[];
}
