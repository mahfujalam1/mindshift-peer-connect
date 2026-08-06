/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import User from '../modules/user/user-model';
import config from '../config';

export type PushNotificationType =
    | 'message'
    | 'consultation'
    | 'expertise'
    | 'customer_support'
    | 'call'
    | 'event'
    | 'coffee_connect'
    | 'lunch_and_learn'
    | 'social_event'
    | 'profile_view';

export type NotificationData = {
    type: PushNotificationType;
} & Record<string, unknown>;

const sendNotification = async (
    subscriptionIds: string[],
    title: string,
    message: string,
    data: NotificationData
) => {
    const { app_id: appId, api_key: apiKey } = config.onesignal;

    if (!appId || !apiKey) {
        throw new Error('Missing OneSignal credentials');
    }

    const uniqueSubscriptionIds = [...new Set(subscriptionIds.filter(Boolean))];
    if (uniqueSubscriptionIds.length === 0) {
        console.warn('No OneSignal subscription IDs provided, skipping notification');
        return;
    }

    try {
        const responses = [];

        // OneSignal accepts at most 20,000 subscription IDs per request.
        for (let index = 0; index < uniqueSubscriptionIds.length; index += 20000) {
            const batch = uniqueSubscriptionIds.slice(index, index + 20000);
            const response = await axios.post(
                'https://api.onesignal.com/notifications',
                {
                    app_id: appId,
                    target_channel: 'push',
                    include_subscription_ids: batch,
                    headings: { en: title },
                    contents: { en: message },
                    data,
                },
                {
                    headers: {
                        Authorization: `Key ${apiKey}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    timeout: 15000,
                }
            );

            if (!response.data?.id) {
                console.warn('OneSignal accepted the request but created no message:', response.data);
            }
            responses.push(response.data);
        }

        return responses;
    } catch (error: any) {
        console.error(
            'Error sending OneSignal notification:',
            error?.response?.data || error.message
        );
        throw error;
    }
};

// Send notification to single user by userId
export const sendSinglePushNotification = async (
    userId: string ,
    title: string,
    message: string,
    data: NotificationData
) => {
    const user = await User.findById(userId).select('playerIds');
    if (!user || !user.playerIds.length) return;
    return sendNotification(user.playerIds, title, message, data);
};

// Send notification to multiple users by userIds
export const sendBatchPushNotification = async (
    userIds: string[],
    title: string,
    message: string,
    data: NotificationData
) => {
    const users = await User.find({ _id: { $in: userIds } }).select(
        'playerIds'
    );

    const allPlayerIds = users.reduce<string[]>((acc, user) => {
        if (user.playerIds && user.playerIds.length)
            acc.push(...user.playerIds);
        return acc;
    }, []);

    if (allPlayerIds.length === 0) return;

    return sendNotification(allPlayerIds, title, message, data);
};

// Send notification to every active, verified user's subscribed devices.
export const sendPushNotificationToAllUsers = async (
    title: string,
    message: string,
    data: NotificationData
) => {
    const users = await User.find({
        isDeleted: false,
        isVerified: true,
        playerIds: { $exists: true, $ne: [] },
    })
        .select('playerIds')
        .lean();

    const allPlayerIds = [
        ...new Set(users.flatMap((user) => user.playerIds || [])),
    ];

    if (allPlayerIds.length === 0) return;

    return sendNotification(allPlayerIds, title, message, data);
};
