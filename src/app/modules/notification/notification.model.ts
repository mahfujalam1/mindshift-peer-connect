import { model, Schema } from 'mongoose';
import { INotification } from './notification.interface';
import { PUSH_NOTIFICATION_TYPES } from '../../helper/sendPushNotification';

const notificationSchema = new Schema<INotification>(
    {
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: PUSH_NOTIFICATION_TYPES,
            required: true,
        },
        seen: {
            type: Boolean,
            default: false,
        },
        receiver: {
            type: String,
            required: true,
        },
        seenBy: {
            type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
            default: [],
        },
        deleteBy: {
            type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
            default: [],
        },
    },

    {
        timestamps: true,
    },
);

const Notification = model<INotification>('Notification', notificationSchema);

export default Notification;
