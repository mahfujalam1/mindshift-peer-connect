import Notification from '../modules/notification/notification.model';
import { NotificationData, sendBatchPushNotification, sendSinglePushNotification } from './sendPushNotification';
import { getIO } from '../socket/socket';
import getNotificationCount from './getUnseenNotification';
import getAdminNotificationCount from './getAdminNotification';
import { USER_ROLE } from '../modules/user/user-constant';

/**
 * Sends a notification to a single user (or admin/all).
 * 1. Saves to DB
 * 2. Emits via Socket.io
 * 3. Sends OneSignal push notification
 */
export const sendNotification = async (
    receiverId: string, // Can be a userId, 'admin', or 'all'
    title: string,
    message: string,
    data: NotificationData
) => {
    try {
        // 1. Save to Database
        await Notification.create({
            title,
            message,
            receiver: receiverId,
            seen: false,
        });

        // 2. Emit Socket Event
        const io = getIO();
        
        if (receiverId === USER_ROLE.admin || receiverId === 'all') {
            const adminCount = await getAdminNotificationCount();
            io.emit('admin-notifications', adminCount);
            
            if (receiverId === 'all') {
                const count = await getNotificationCount();
                io.emit('notifications', count);
            }
        } else {
            const count = await getNotificationCount(receiverId);
            io.to(receiverId).emit('notifications', count);
        }

        // 3. Send Push Notification
        if (receiverId !== 'all' && receiverId !== USER_ROLE.admin) {
            await sendSinglePushNotification(receiverId, title, message, data);
        }
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

/**
 * Sends a notification to multiple users.
 * 1. Saves multiple DB records
 * 2. Emits via Socket.io to each user
 * 3. Sends Batch OneSignal push notification
 */
export const sendNotifications = async (
    userIds: string[],
    title: string,
    message: string,
    data: NotificationData
) => {
    try {
        if (!userIds || userIds.length === 0) return;

        // 1. Save to Database
        const notificationsToInsert = userIds.map((userId) => ({
            title,
            message,
            receiver: userId,
            seen: false,
        }));
        await Notification.insertMany(notificationsToInsert);

        // 2. Emit Socket Event
        const io = getIO();
        for (const userId of userIds) {
            const count = await getNotificationCount(userId);
            io.to(userId).emit('notifications', count);
        }

        // 3. Send Push Notification
        await sendBatchPushNotification(userIds, title, message, data);
    } catch (error) {
        console.error('Error sending batch notifications:', error);
    }
};
