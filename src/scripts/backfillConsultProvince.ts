/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * One-off maintenance: copies the author's profile province onto consult posts
 * created before consults stored a province, so they show up in the
 * Provincewide feed. Posts whose author has no province yet are left as-is.
 *
 *   npm run backfill:consult-province          # report only
 *   npm run backfill:consult-province -- --fix # report and update
 */
import mongoose from 'mongoose';
import config from '../app/config';
import { Consult } from '../app/modules/consult/consult.model';
import User from '../app/modules/user/user-model';

const main = async () => {
    const shouldFix = process.argv.includes('--fix');

    await mongoose.connect(config.database_url as string);

    const consults = await Consult.find({
        $or: [{ province: { $exists: false } }, { province: null }, { province: '' }],
    })
        .select('_id author')
        .lean();

    const authorIds = [...new Set(consults.map((consult) => String(consult.author)))];
    const authors = await User.find({
        _id: { $in: authorIds },
        province: { $nin: [null, ''] },
    })
        .select('_id province')
        .lean();

    const provinceByAuthor = new Map(
        authors.map((author) => [String(author._id), String(author.province).trim()])
    );

    const updates = consults
        .map((consult) => ({
            consultId: consult._id,
            province: provinceByAuthor.get(String(consult.author)),
        }))
        .filter((item): item is { consultId: any; province: string } => Boolean(item.province));

    console.log(
        `${consults.length} consult(s) without province, ${updates.length} can be filled from the author's profile.`
    );

    if (!updates.length || !shouldFix) {
        if (updates.length) console.log('Dry run. Re-run with --fix to update them.');
        await mongoose.disconnect();
        return;
    }

    const result = await Consult.bulkWrite(
        updates.map(({ consultId, province }) => ({
            updateOne: {
                filter: { _id: consultId },
                update: { $set: { province } },
            },
        }))
    );

    console.log(`Updated ${result.modifiedCount} consult(s).`);
    await mongoose.disconnect();
};

main().catch(async (error: any) => {
    console.error('Backfill failed:', error.message);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});
