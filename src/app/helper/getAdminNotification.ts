import Notification from '../modules/notification/notification.model';
const getAdminNotificationCount = async (adminId = '') => {
  const unseenCount = await Notification.countDocuments({
    seenBy: { $ne: adminId },
    $or: [{ receiver: 'admin' }, { receiver: 'all' }],
  });
  const latestNotification = await Notification.findOne({
    $or: [{ receiver: 'admin' }, { receiver: 'all' }],
  })
    .sort({ createdAt: -1 })
    .lean();
  return { unseenCount, latestNotification };
};

export default getAdminNotificationCount;
