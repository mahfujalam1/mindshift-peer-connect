import cron from 'node-cron';
import { CoffeeConnect } from './coffee-connect.model';
import { sendBatchPushNotification } from '../../helper/sendPushNotification';

export const coffeeConnectCron = cron.schedule('* * * * *', async () => {
  const now = new Date();

  // 1. Mark as expired
  const allEvents = await CoffeeConnect.find({ isExpired: false, isDeleted: false });
  for (const event of allEvents) {
    if (!event.endAt) continue;
    if (now > event.endAt) {
      event.isExpired = true;
      await event.save();
      console.log(`Event ${event._id} marked as expired`);
    }
  }

  // 2. Notifications (2 hours before)
  const events2h = await CoffeeConnect.find({
    isExpired: false,
    isDeleted: false,
    notified2h: false,
  });

  for (const event of events2h) {
    if (!event.startAt) continue;
    const diffInMinutes = Math.floor(
      (event.startAt.getTime() - now.getTime()) / (1000 * 60)
    );

    if (diffInMinutes <= 120 && diffInMinutes > 10) {
      if (event.participants.length > 0) {
        await sendBatchPushNotification(
          event.participants.map((p) => p.toString()),
          '☕ Coffee Connect Reminder',
          `Your event "${event.title}" starts in 2 hours!`,
          { type: 'coffee_connect', eventId: event._id }
        );
      }
      event.notified2h = true;
      await event.save();
    }
  }

  // 3. Notifications (10 minutes before)
  const events10m = await CoffeeConnect.find({
    isExpired: false,
    isDeleted: false,
    notified10m: false,
  });

  for (const event of events10m) {
    if (!event.startAt) continue;
    const diffInMinutes = Math.floor(
      (event.startAt.getTime() - now.getTime()) / (1000 * 60)
    );

    if (diffInMinutes <= 10 && diffInMinutes > 0) {
      if (event.participants.length > 0) {
        await sendBatchPushNotification(
          event.participants.map((p) => p.toString()),
          '☕ Coffee Connect Starting Soon',
          `Your event "${event.title}" starts in 10 minutes! Join link is now available.`,
          { type: 'coffee_connect', eventId: event._id }
        );
      }
      event.notified10m = true;
      await event.save();
    }
  }
});
