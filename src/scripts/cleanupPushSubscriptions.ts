/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * One-off maintenance: compares every subscription id stored on users against
 * OneSignal and removes the ones that can no longer receive a push.
 *
 *   npm run cleanup:push          # report only
 *   npm run cleanup:push -- --fix # report and delete
 */
import axios from 'axios';
import mongoose from 'mongoose';
import config from '../app/config';
import User from '../app/modules/user/user-model';
import { pruneInvalidSubscriptionIds } from '../app/helper/pushSubscription';

type OneSignalPlayer = {
    id: string;
    identifier?: string | null;
    invalid_identifier?: boolean;
    notification_types?: number | null;
    device_type?: number;
};

const fetchAllPlayers = async (appId: string, apiKey: string) => {
    const players: OneSignalPlayer[] = [];
    const limit = 300;
    let offset = 0;

    for (;;) {
        const { data } = await axios.get('https://api.onesignal.com/players', {
            params: { app_id: appId, limit, offset },
            headers: { Authorization: `Key ${apiKey}`, Accept: 'application/json' },
            timeout: 20000,
        });

        const page: OneSignalPlayer[] = data?.players || [];
        players.push(...page);

        offset += page.length;
        if (page.length < limit || offset >= (data?.total_count ?? 0)) break;
    }

    return players;
};

// A subscription can only be delivered to when OneSignal holds a push token
// that the platform has not rejected.
const isDeliverable = (player: OneSignalPlayer) =>
    Boolean(player.identifier) &&
    player.invalid_identifier !== true &&
    (player.notification_types == null || player.notification_types > 0);

const main = async () => {
    const shouldFix = process.argv.includes('--fix');
    const { app_id: appId, api_key: apiKey } = config.onesignal;

    if (!appId || !apiKey) throw new Error('Missing OneSignal credentials');

    await mongoose.connect(config.database_url as string);

    const players = await fetchAllPlayers(appId, apiKey);
    const deliverable = new Set(players.filter(isDeliverable).map((p) => p.id));

    console.log(
        `OneSignal: ${players.length} subscription(s), ${deliverable.size} deliverable.`
    );

    const users = await User.find({ playerIds: { $exists: true, $ne: [] } })
        .select('email playerIds')
        .lean();

    const staleIds = new Set<string>();

    for (const user of users) {
        const stale = (user.playerIds || []).filter((id) => !deliverable.has(id));
        if (!stale.length) continue;

        stale.forEach((id) => staleIds.add(id));
        console.log(
            `  ${user.email}: ${stale.length}/${user.playerIds.length} stale -> ${stale.join(', ')}`
        );
    }

    console.log(
        `\n${staleIds.size} stale subscription id(s) across ${users.length} user(s) with devices.`
    );

    if (!staleIds.size) {
        await mongoose.disconnect();
        return;
    }

    if (!shouldFix) {
        console.log('Dry run. Re-run with --fix to remove them.');
        await mongoose.disconnect();
        return;
    }

    const modified = await pruneInvalidSubscriptionIds([...staleIds]);
    console.log(`Removed stale ids from ${modified} user(s).`);

    await mongoose.disconnect();
};

main().catch(async (error: any) => {
    console.error('Cleanup failed:', error?.response?.data || error.message);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});
