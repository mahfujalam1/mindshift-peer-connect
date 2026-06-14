import { coffeeConnectCron } from '../coffee-connect/coffee-connect.cron';
import { lunchAndLearnCron } from '../lunch-and-learn/lunch-and-learn.cron';
import { socialEventCron } from '../social-event/social-event.cron';
import { eventCron } from '../event/event.cron';

export const startCronJobs = () => {
    console.log('Starting cron jobs...');

    coffeeConnectCron.start();
    lunchAndLearnCron.start();
    socialEventCron.start();
    eventCron.start();

    console.log('Cron jobs started successfully');
};
