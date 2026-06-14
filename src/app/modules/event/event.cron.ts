import cron from 'node-cron';
import { Event } from './event.model';
import { sendBatchPushNotification } from '../../helper/sendPushNotification';

export const eventCron = cron.schedule('* * * * *', async () => {
  const now = new Date();

  // 1. Mark as expired
  const allEvents = await Event.find({ isExpired: false, isDeleted: false });
  for (const event of allEvents) {
    const endDateTime = new Date(`${event.date}T${event.endTime}:00`);
    if (now > endDateTime) {
      event.isExpired = true;
      await event.save();
      console.log(`Event ${event._id} (${event.eventType}) marked as expired`);
    }
  }

  // 2. Notifications (2 days before) - Specifically for SocialEvent (offline)
  const events2d = await Event.find({
    eventType: 'SocialEvent',
    isOnline: false,
    isExpired: false,
    isDeleted: false,
    notified2d: false,
  });

  for (const event of events2d) {
    const startDateTime = new Date(`${event.date}T${event.startTime}:00`);
    const diffInDays = (startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (diffInDays <= 2 && diffInDays > 0) {
      if (event.participants.length > 0) {
        await sendBatchPushNotification(
          event.participants.map((p) => p.toString()),
          '🎉 Social Event Reminder',
          `The event "${event.title}" is happening in 2 days!`,
          { type: 'event', eventId: event._id, eventType: event.eventType }
        );
      }
      event.notified2d = true;
      await event.save();
    }
  }

  // 3. Notifications (2 hours before) - For Online events
  const events2h = await Event.find({
    isOnline: true,
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
          '⏰ Event Reminder',
          `Your ${event.eventType} "${event.title}" starts in 2 hours!`,
          { type: 'event', eventId: event._id, eventType: event.eventType }
        );
      }
      event.notified2h = true;
      await event.save();
    }
  }

  // 4. Notifications (10 minutes before) - For Online events
  const events10m = await Event.find({
    isOnline: true,
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
          '🚀 Event Starting Soon',
          `Your ${event.eventType} "${event.title}" starts in 10 minutes! Join link is now available.`,
          { type: 'event', eventId: event._id, eventType: event.eventType }
        );
      }
      event.notified10m = true;
      await event.save();
    }
  }
});
