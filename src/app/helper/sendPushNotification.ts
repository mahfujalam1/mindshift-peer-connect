/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import User from '../modules/user/user-model';
import config from '../config';
import { pruneInvalidSubscriptionIds } from './pushSubscription';

export const PUSH_NOTIFICATION_TYPES = [
    'message',
    'consultation',
    'expertise',
    'customer_support',
    'call',
    'event',
    'coffee_connect',
    'lunch_and_learn',
    'social_event',
    'profile_view',
] as const;

export type PushNotificationType = (typeof PUSH_NOTIFICATION_TYPES)[number];

export type NotificationData = {
    type: PushNotificationType;
} & Record<string, unknown>;

/**
 * OneSignal answers with HTTP 200 even when it delivered nothing, reporting
 * the reason inside `errors`. Treating that as success is what makes a broken
 * push setup look like silence, so every response is inspected here.
 */
const handleOneSignalResponse = async (
    responseData: any,
    batch: string[],
    title: string
) => {
    const recipients = responseData?.recipients ?? 0;
    const errors = responseData?.errors;

    // `errors.invalid_player_ids` lists ids OneSignal does not recognise or
    // that have no valid push token. They will never work again, so drop them.
    const invalidIds: string[] = Array.isArray(errors?.invalid_player_ids)
        ? errors.invalid_player_ids
        : [];

    if (invalidIds.length) {
        const affectedUsers = await pruneInvalidSubscriptionIds(invalidIds);
        console.warn(
            `[push] OneSignal rejected ${invalidIds.length}/${batch.length} subscription id(s) for "${title}". ` +
                `Removed them from ${affectedUsers} user(s).`,
            invalidIds
        );
    }

    // A plain array means the whole request was rejected, e.g.
    // ["All included players are not subscribed"].
    if (Array.isArray(errors) && errors.length) {
        console.error(
            `[push] OneSignal refused the notification "${title}":`,
            errors
        );
        return;
    }

    if (!responseData?.id) {
        console.error(
            `[push] OneSignal created no message for "${title}". Response:`,
            responseData
        );
        return;
    }

    if (!recipients) {
        console.warn(
            `[push] Notification "${title}" reached 0 devices (${batch.length} subscription id(s) targeted). ` +
                `Check that the devices have a valid APNs/FCM token in OneSignal.`
        );
        return;
    }

    console.log(
        `[push] Notification "${title}" delivered to ${recipients} device(s).`
    );
};

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

            await handleOneSignalResponse(response.data, batch, title);
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
    if (!user || !user.playerIds.length) {
        console.warn(
            `[push] Skipping "${title}": user ${userId} has no registered device.`
        );
        return;
    }
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

    if (allPlayerIds.length === 0) {
        console.warn(
            `[push] Skipping "${title}": none of the ${userIds.length} targeted user(s) has a registered device.`
        );
        return;
    }

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

    if (allPlayerIds.length === 0) {
        console.warn(`[push] Skipping "${title}": no user has a registered device.`);
        return;
    }

    return sendNotification(allPlayerIds, title, message, data);
};
