import cron from 'node-cron';
import { LunchAndLearn } from './lunch-and-learn.model';
import { sendBatchPushNotification } from '../../helper/sendPushNotification';

export const lunchAndLearnCron = cron.schedule('* * * * *', async () => {
  const now = new Date();

  // 1. Mark as expired
  const allEvents = await LunchAndLearn.find({ isExpired: false, isDeleted: false });
  for (const event of allEvents) {
    const endDateTime = new Date(`${event.date}T${event.endTime}:00`);
    if (now > endDateTime) {
      event.isExpired = true;
      await event.save();
      console.log(`Lunch and Learn Event ${event._id} marked as expired`);
    }
  }

  // 2. Notifications (2 hours before)
  const events2h = await LunchAndLearn.find({
    isExpired: false,
    isDeleted: false,
    notified2h: false,
  });

  for (const event of events2h) {
    const startDateTime = new Date(`${event.date}T${event.startTime}:00`);
    const diffInMinutes = Math.floor((startDateTime.getTime() - now.getTime()) / (1000 * 60));

    if (diffInMinutes <= 120 && diffInMinutes > 10) {
      if (event.participants.length > 0) {
        await sendBatchPushNotification(
          event.participants.map((p) => p.toString()),
          '🍱 Lunch and Learn Reminder',
          `Your event "${event.title}" starts in 2 hours!`,
          { type: 'lunch_and_learn', eventId: event._id }
        );
      }
      event.notified2h = true;
      await event.save();
    }
  }

  // 3. Notifications (10 minutes before)
  const events10m = await LunchAndLearn.find({
    isExpired: false,
    isDeleted: false,
    notified10m: false,
  });

  for (const event of events10m) {
    const startDateTime = new Date(`${event.date}T${event.startTime}:00`);
    const diffInMinutes = Math.floor((startDateTime.getTime() - now.getTime()) / (1000 * 60));

    if (diffInMinutes <= 10 && diffInMinutes > 0) {
      if (event.participants.length > 0) {
        await sendBatchPushNotification(
          event.participants.map((p) => p.toString()),
          '🍱 Lunch and Learn Starting Soon',
          `Your event "${event.title}" starts in 10 minutes! Join link is now available.`,
          { type: 'lunch_and_learn', eventId: event._id }
        );
      }
      event.notified10m = true;
      await event.save();
    }
  }
});
