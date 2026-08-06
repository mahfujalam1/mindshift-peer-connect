import { Types } from 'mongoose';
import { ProfileView } from './profile-view.model';
import User from '../user/user-model';

/**
 * Log a profile view asynchronously.
 * Upserts a document to keep track of the most recent time the viewer viewed the target.
 */
const logProfileView = async (viewerId: string, targetId: string) => {
  if (viewerId === targetId) return;

  try {
    // Only log if both users exist and are valid ObjectIds
    if (!Types.ObjectId.isValid(viewerId) || !Types.ObjectId.isValid(targetId)) {
      return;
    }

    const [viewer, targetExists] = await Promise.all([
      User.findById(viewerId).select('fullName').lean(),
      User.exists({ _id: targetId }),
    ]);

    if (!viewer || !targetExists) return;

    const existingView = await ProfileView.findOne({
      viewer: new Types.ObjectId(viewerId),
      target: new Types.ObjectId(targetId),
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const shouldNotify = !existingView || !existingView.updatedAt || existingView.updatedAt < oneDayAgo;

    await ProfileView.findOneAndUpdate(
      { viewer: new Types.ObjectId(viewerId), target: new Types.ObjectId(targetId) },
      { $set: { updatedAt: new Date() } }, // updates the timestamp
      { upsert: true, new: true }
    );

    if (shouldNotify) {
      import('../../helper/notificationHelper').then(({ sendNotification }) => {
        sendNotification(
          targetId,
          'Profile View',
          `${viewer.fullName} viewed your profile`,
          { type: 'profile_view', viewerId }
        );
      });
    }
  } catch (error) {
    console.error('Error logging profile view:', error);
  }
};

/**
 * Fetch the list of users who viewed the target user's profile.
 */
const getMyProfileViews = async (targetId: string, query: Record<string, unknown>) => {
  const page = Number(query?.page) || 1;
  const limit = Number(query?.limit) || 10;
  const skip = (page - 1) * limit;

  const total = await ProfileView.countDocuments({ target: new Types.ObjectId(targetId) });

  const views = await ProfileView.find({ target: new Types.ObjectId(targetId) })
    .populate({
      path: 'viewer',
      select: 'fullName profileImage profession country city',
      populate: {
        path: 'profession',
        select: 'name',
      },
    })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    result: views,
  };
};

export const ProfileViewServices = {
  logProfileView,
  getMyProfileViews,
};
