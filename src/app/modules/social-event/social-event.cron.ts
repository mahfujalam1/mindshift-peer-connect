import cron from 'node-cron';
import { SocialEvent } from './social-event.model';
import { sendBatchPushNotification } from '../../helper/sendPushNotification';

export const socialEventCron = cron.schedule('* * * * *', async () => {
  const now = new Date();

  // 1. Mark as expired
  const allEvents = await SocialEvent.find({ isExpired: false, isDeleted: false });
  for (const event of allEvents) {
    const endDateTime = new Date(`${event.date}T${event.endTime}:00`);
    if (now > endDateTime) {
      event.isExpired = true;
      await event.save();
      console.log(`Social Event ${event._id} marked as expired`);
    }
  }

  // 2. Notifications (2 days before)
  const events2d = await SocialEvent.find({
    isExpired: false,
    isDeleted: false,
    notified2d: false,
  });

  for (const event of events2d) {
    const startDateTime = new Date(`${event.date}T${event.startTime}:00`);
    const diffInMs = startDateTime.getTime() - now.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInDays <= 2 && diffInDays > 0) {
      if (event.participants.length > 0) {
        await sendBatchPushNotification(
          event.participants.map((p) => p.toString()),
          '🎉 Social Event Reminder',
          `The event "${event.title}" is happening in 2 days! Don't forget your entry requirements.`,
          { type: 'social_event', eventId: event._id }
        );
      }
      event.notified2d = true;
      await event.save();
    }
  }
});
