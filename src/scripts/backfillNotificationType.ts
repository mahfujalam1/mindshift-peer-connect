/* eslint-disable no-console */
/**
 * One-off maintenance: fills in the `type` field on notifications created
 * before the field existed on the schema. Those documents were written while
 * Mongoose still stripped unknown keys, so `type` is simply absent on them.
 *
 * The mapping is derived from the exact titles used by every sendNotification
 * call site, so nothing is guessed: a document whose title is not recognised is
 * reported and left untouched rather than given a wrong type.
 *
 *   npm run backfill:notification-type          # report only
 *   npm run backfill:notification-type -- --fix # report and write
 */
import mongoose from 'mongoose';
import config from '../app/config';
import Notification from '../app/modules/notification/notification.model';
import type { PushNotificationType } from '../app/helper/sendPushNotification';

/** Exact titles emitted by the sendNotification call sites. */
const TITLE_TO_TYPE: Record<string, PushNotificationType> = {
    // Current titles (no emoji)
    'New Local Consultation Request': 'consultation',
    'New Consultation Request': 'consultation',
    'Someone is interested!': 'consultation',
    'New Customer Support Query': 'customer_support',
    'Customer Support Reply': 'customer_support',
    'Social Event Reminder': 'event',
    'Event Reminder': 'event',
    'Event Starting Soon': 'event',
    'Event Request Accepted': 'event',
    'New Event Created': 'event',
    'New Social Event': 'event',
    'New Coffee Connect Event': 'coffee_connect',
    'Coffee Connect Reminder': 'coffee_connect',
    'Coffee Connect Starting Soon': 'coffee_connect',
    'New Hotcast Event': 'lunch_and_learn',
    'Hotcast Reminder': 'lunch_and_learn',
    'Hotcast Starting Soon': 'lunch_and_learn',
    'Event Registration': 'event',
    'Consultation Request Accepted': 'consultation',
    'Incoming video call': 'call',
    'Incoming audio call': 'call',
    'Profile View': 'profile_view',
    // Legacy titles (with emoji) for older DB rows
    '🤝 New Local Consultation Request': 'consultation',
    '🤝 New Consultation Request': 'consultation',
    '🎉 Social Event Reminder': 'event',
    '⏰ Event Reminder': 'event',
    '🚀 Event Starting Soon': 'event',
    '🎉 New Event Created': 'event',
    '🎉 New Social Event': 'event',
    '☕ New Coffee Connect Event': 'coffee_connect',
    '☕ Coffee Connect Reminder': 'coffee_connect',
    '☕ Coffee Connect Starting Soon': 'coffee_connect',
    '🎙️ New Hotcast Event': 'lunch_and_learn',
    '🎙️ Hotcast Reminder': 'lunch_and_learn',
    '🎙️ Hotcast Starting Soon': 'lunch_and_learn',
};

/** Fallback for titles that drifted (emoji changes, wording tweaks). */
const KEYWORD_RULES: Array<[RegExp, PushNotificationType]> = [
    [/consultation|interested/i, 'consultation'],
    [/customer support/i, 'customer_support'],
    [/coffee connect/i, 'coffee_connect'],
    [/lunch and learn/i, 'lunch_and_learn'],
    [/event/i, 'event'],
    [/profile view/i, 'profile_view'],
    [/expertise/i, 'expertise'],
    [/\bcall\b/i, 'call'],
    [/message/i, 'message'],
];

const resolveType = (title: string): PushNotificationType | null => {
    const exact = TITLE_TO_TYPE[title];
    if (exact) return exact;

    for (const [pattern, type] of KEYWORD_RULES) {
        if (pattern.test(title)) return type;
    }
    return null;
};

const main = async () => {
    const apply = process.argv.includes('--fix');

    await mongoose.connect(config.database_url as string);
    console.log(`[backfill] connected${apply ? ' (--fix: will write)' : ' (dry run)'}`);

    const legacy = await Notification.find({ type: { $exists: false } })
        .select('_id title')
        .lean();

    if (!legacy.length) {
        console.log('[backfill] nothing to do — every notification already has a type.');
        return;
    }

    console.log(`[backfill] ${legacy.length} notification(s) without a type.`);

    // Group by resolved type so the whole backfill is a handful of bulk writes
    // instead of one round trip per document.
    const buckets = new Map<PushNotificationType, mongoose.Types.ObjectId[]>();
    const unresolved = new Map<string, number>();

    for (const doc of legacy) {
        const type = resolveType(doc.title || '');
        if (!type) {
            unresolved.set(doc.title || '(no title)', (unresolved.get(doc.title || '(no title)') || 0) + 1);
            continue;
        }
        const bucket = buckets.get(type) || [];
        bucket.push(doc._id as mongoose.Types.ObjectId);
        buckets.set(type, bucket);
    }

    for (const [type, ids] of buckets) {
        console.log(`[backfill]   ${type.padEnd(18)} ${ids.length}`);
        if (apply) {
            await Notification.updateMany({ _id: { $in: ids } }, { $set: { type } });
        }
    }

    if (unresolved.size) {
        console.warn(
            `[backfill] ${unresolved.size} unrecognised title(s) left untouched — ` +
                'add them to TITLE_TO_TYPE and re-run:'
        );
        for (const [title, count] of unresolved) {
            console.warn(`[backfill]   ${count}x  ${JSON.stringify(title)}`);
        }
    }

    console.log(
        apply
            ? '[backfill] done.'
            : '[backfill] dry run complete — re-run with -- --fix to write.'
    );
};

main()
    .catch((error) => {
        console.error('[backfill] failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
