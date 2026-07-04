import cron from 'node-cron';
import { CoffeeConnect } from '../coffee-connect/coffee-connect.model';
import { LunchAndLearn } from '../lunch-and-learn/lunch-and-learn.model';
import { SocialEvent } from '../social-event/social-event.model';
import { sendNotifications } from '../../helper/notificationHelper';

export const eventCron = cron.schedule('* * * * *', async () => {
  const now = new Date();

  // All three models to iterate over
  const models: { Model: any; type: string }[] = [
    { Model: CoffeeConnect, type: 'CoffeeConnect' },
    { Model: LunchAndLearn, type: 'LunchAndLearn' },
    { Model: SocialEvent, type: 'SocialEvent' },
  ];

  // 1. Mark as expired across all collections
  for (const { Model, type } of models) {
    const allEvents = await Model.find({ isExpired: false, isDeleted: false });
    for (const event of allEvents) {
      const endDateTime = new Date(`${event.date}T${event.endTime}:00`);
      if (now > endDateTime) {
        event.isExpired = true;
        await event.save();
        console.log(`Event ${event._id} (${type}) marked as expired`);
      }
    }
  }

  // 2. Notifications (2 days before) - Specifically for SocialEvent (offline)
  const events2d = await SocialEvent.find({
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
        await sendNotifications(
          event.participants.map((p: any) => p.toString()),
          '🎉 Social Event Reminder',
          `The event "${event.title}" is happening in 2 days!`,
          { type: 'event', eventId: event._id, eventType: 'SocialEvent' }
        );
      }
      (event as any).notified2d = true;
      await event.save();
    }
  }

  // 3. Notifications (2 hours before) - For Online events (CoffeeConnect & LunchAndLearn)
  for (const { Model, type } of models) {
    const events2h = await Model.find({
      isExpired: false,
      isDeleted: false,
      notified2h: false,
    });

    for (const event of events2h) {
      // Only online events get this notification
      if (!(event as any).zoomJoinUrl) continue;

      const startDateTime = new Date(`${event.date}T${event.startTime}:00`);
      const diffInMinutes = Math.floor((startDateTime.getTime() - now.getTime()) / (1000 * 60));

      if (diffInMinutes <= 120 && diffInMinutes > 10) {
        if (event.participants.length > 0) {
          await sendNotifications(
            event.participants.map((p: any) => p.toString()),
            '⏰ Event Reminder',
            `Your ${type} "${event.title}" starts in 2 hours!`,
            { type: 'event', eventId: event._id, eventType: type }
          );
        }
        event.notified2h = true;
        await event.save();
      }
    }
  }

  // 4. Notifications (10 minutes before) - For Online events
  for (const { Model, type } of models) {
    const events10m = await Model.find({
      isExpired: false,
      isDeleted: false,
      notified10m: false,
    });

    for (const event of events10m) {
      if (!(event as any).zoomJoinUrl) continue;

      const startDateTime = new Date(`${event.date}T${event.startTime}:00`);
      const diffInMinutes = Math.floor((startDateTime.getTime() - now.getTime()) / (1000 * 60));

      if (diffInMinutes <= 10 && diffInMinutes > 0) {
        if (event.participants.length > 0) {
          await sendNotifications(
            event.participants.map((p: any) => p.toString()),
            '🚀 Event Starting Soon',
            `Your ${type} "${event.title}" starts in 10 minutes! Join link is now available.`,
            { type: 'event', eventId: event._id, eventType: type }
          );
        }
        event.notified10m = true;
        await event.save();
      }
    }
  }
});
