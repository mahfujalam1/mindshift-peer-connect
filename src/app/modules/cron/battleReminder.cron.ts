// import cron from 'node-cron';
// import { Battle } from '../battle/battle.model';
// import { BattleStatus } from '../battle/battle.interface';
// import { BattleLog } from '../battleLog/battleLog.model';
// import { sendBatchPushNotification } from '../../helper/sendPushNotification';
// import { BattleLogStatus } from '../battleLog/battleLog.interface';
// import { BattleServices } from '../battle/battle.service';


// export const battleReminderCron = cron.schedule('58 23 * * *', async () => {

//     try {
//         // Don't populate - just get userId directly
//         const activeBattles = await Battle.find({
//             battleStatus: BattleStatus.ACTIVE,
//             sendReminder: true,
//             isDeleted: false
//         }).select('_id userId day'); // Select only needed fields


//         const usersToNotify = new Set<string>();

//         for (const battle of activeBattles) {
//             try {
//                 const todayLog = await BattleLog.findOne({
//                     battleId: battle._id,
//                     day: battle.day,
//                     status: null
//                 });

//                 if (todayLog && battle.userId) {
//                     usersToNotify.add(battle.userId.toString());
//                 }
//             } catch (err) {
//                 continue;
//             }
//         }

//         const userArray = Array.from(usersToNotify);

//         if (userArray.length > 0) {

//             await sendBatchPushNotification(
//                 userArray,
//                 '⚔️ Battle Reminder',
//                 "Complete today's battle or lose your streak!",
//                 { type: 'battle_reminder', screen: 'BattleScreen' }
//             );

//         } else {
//             console.log('✅ No reminders needed - all battles completed!');
//         }

//     } catch (error) {
//         console.error('❌ Critical error in cron:', error);
//     }
// });




// export const markMissedDaysCron = cron.schedule('*/5 * * * *', async () => {
//     try {
//         const activeBattles = await Battle.find({
//             battleStatus: BattleStatus.ACTIVE,
//             isDeleted: false
//         });

//         if (activeBattles.length === 0) return;

//         for (const battle of activeBattles) {
//             try {
//                 const currentBattleDay = battle.day;

//                 const currentDayLog = await BattleLog.findOne({
//                     battleId: battle._id,
//                     day: currentBattleDay,
//                 });

//                 if (!currentDayLog) continue;

//                 const isBattleComplete = currentBattleDay === battle.battleLength;

//                 if (currentDayLog.totalCraved > currentDayLog.totalCaved) {
//                     // ✅ Log update
//                     currentDayLog.status = BattleLogStatus.CRAVED;
//                     await currentDayLog.save();

//                     // ✅ Battle basic fields update (progress service করবে)
//                     battle.day += 1;
//                     battle.lastCheckInStatus = BattleLogStatus.CRAVED;
//                     battle.lastCheckInAt = new Date();
//                     if (isBattleComplete) battle.battleStatus = BattleStatus.COMPLETE;
//                     await battle.save();

//                     // ✅ Service এ পাঠাও — progress + badge সব ওখানে হবে
//                     await BattleServices.BattleOrBadgeProgress(battle);

//                 } else {
//                     // ✅ MISSED বা CAVED — progress update দরকার নেই, শুধু day advance
//                     battle.day += 1;
//                     battle.lastCheckInAt = new Date();

//                     if (currentDayLog.totalCraved === 0 && currentDayLog.totalCaved === 0) {
//                         battle.lastCheckInStatus = BattleLogStatus.MISSED;
//                         currentDayLog.status = BattleLogStatus.MISSED;
//                     } else {
//                         battle.lastCheckInStatus = BattleLogStatus.CAVED;
//                         currentDayLog.status = BattleLogStatus.CAVED;
//                     }

//                     if (isBattleComplete) battle.battleStatus = BattleStatus.COMPLETE;

//                     await currentDayLog.save();
//                     await battle.save();
//                     // ❌ Service call নেই — MISSED/CAVED এ badge/progress update হবে না
//                 }

//             } catch (battleError) {
//                 console.error(`❌ Error processing battle ${battle._id}:`, battleError);
//                 continue;
//             }
//         }

//     } catch (error) {
//         console.error('❌ Critical error in mark missed days cron:', error);
//     }
// }, {
//     timezone: "UTC"
// });
