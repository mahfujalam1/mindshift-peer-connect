import { model, Schema } from 'mongoose';
import { INotification } from './notification.interface';

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
