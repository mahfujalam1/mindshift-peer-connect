import User from '../modules/user/user-model';

// OneSignal creates a new subscription id per install, so a user that
// reinstalls or switches devices keeps accumulating ids. We only keep the
// most recently seen ones.
export const MAX_DEVICES_PER_USER = 3;

export const normalizeSubscriptionId = (
    subscriptionId?: string | null
): string | null => {
    if (typeof subscriptionId !== 'string') return null;
    const trimmed = subscriptionId.trim();
    return trimmed.length ? trimmed : null;
};

/**
 * Attaches a OneSignal subscription id to a user.
 *
 * The id is first detached from every other account: one physical device can
 * only be signed in as one user, so leaving it attached elsewhere would send
 * that device another user's notifications.
 */
export const registerPushSubscription = async (
    userId: string,
    subscriptionId?: string | null
) => {
    const id = normalizeSubscriptionId(subscriptionId);
    if (!id) return null;

    await User.updateMany(
        { _id: { $ne: userId }, playerIds: id },
        { $pull: { playerIds: id } }
    );

    const user = await User.findById(userId).select('playerIds');
    if (!user) return null;

    // Re-adding an existing id moves it to the end, so the oldest device is
    // always the one dropped when the limit is reached.
    const playerIds = (user.playerIds || []).filter(
        (existing) => existing !== id
    );
    playerIds.push(id);

    while (playerIds.length > MAX_DEVICES_PER_USER) {
        playerIds.shift();
    }

    await User.findByIdAndUpdate(userId, { playerIds });
    return playerIds;
};

/** Detaches a subscription id from a user (logout, notifications turned off). */
export const unregisterPushSubscription = async (
    userId: string,
    subscriptionId?: string | null
) => {
    const id = normalizeSubscriptionId(subscriptionId);
    if (!id) return null;

    await User.findByIdAndUpdate(userId, { $pull: { playerIds: id } });

    const user = await User.findById(userId).select('playerIds');
    return user?.playerIds || [];
};

/**
 * Removes subscription ids that OneSignal has rejected from every user.
 * Without this, dead ids stay in Mongo forever and every send keeps failing
 * against them.
 */
export const pruneInvalidSubscriptionIds = async (subscriptionIds: string[]) => {
    const unique = [
        ...new Set(
            subscriptionIds
                .map((id) => normalizeSubscriptionId(id))
                .filter((id): id is string => Boolean(id))
        ),
    ];

    if (!unique.length) return 0;

    const result = await User.updateMany(
        { playerIds: { $in: unique } },
        { $pull: { playerIds: { $in: unique } } }
    );

    return result.modifiedCount ?? 0;
};
