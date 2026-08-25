import cron from 'node-cron';
import { Consult } from './consult.model';

const CONSULT_RETENTION_DAYS = 30;

export const removeExpiredConsults = async () => {
  const expiresBefore = new Date(
    Date.now() - CONSULT_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  const result = await Consult.deleteMany({
    createdAt: { $lte: expiresBefore },
  });

  if (result.deletedCount > 0) {
    console.log(`Removed ${result.deletedCount} expired consult post(s)`);
  }

  return result.deletedCount;
};

// Run at the beginning of every hour.
export const consultCleanupCron = cron.schedule('0 * * * *', async () => {
  try {
    await removeExpiredConsults();
  } catch (error) {
    console.error('Failed to remove expired consult posts:', error);
  }
});
