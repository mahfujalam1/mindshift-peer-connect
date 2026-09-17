/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { JwtPayload } from 'jsonwebtoken';
import QueryBuilder from '../../builder/QueryBuilder';
import Notification from './notification.model';
import getAdminNotificationCount from '../../helper/getAdminNotification';
import { getIO } from '../../socket/socket';
import getNotificationCount from '../../helper/getUnseenNotification';
import AppError from '../../error/appError';
import httpStatus from 'http-status';
import { USER_ROLE } from '../user/user-constant';

const getAllNotificationFromDB = async (
    query: Record<string, any>,
    user: JwtPayload,
) => {
    const currentUserId = user?.id;
    const formatNotifications = (notifications: any[]) =>
        notifications.map((notification) => {
            const notificationObj = notification.toObject
                ? notification.toObject()
                : notification;

            return {
                ...notificationObj,
                seen: (notificationObj.seenBy || []).some(
                    (seenUser: any) =>
                        String(seenUser?._id || seenUser) === currentUserId
                ),
                deleted: false,
            };
        });

    if (user?.role === USER_ROLE.admin) {
        const notificationQuery = new QueryBuilder(
            Notification.find({
                $or: [{ receiver: USER_ROLE.admin }, { receiver: 'all' }],
                deleteBy: { $ne: currentUserId },
            })
                .populate('seenBy deleteBy', '_id fullName email'),
            query,
        )
            .search(['title'])
            .filter()
            .sort()
            .paginate()
            .fields();
        const result = await notificationQuery.modelQuery;
        const meta = await notificationQuery.countTotal();
        return { meta, result: formatNotifications(result) };
    } else {
        const notificationQuery = new QueryBuilder(
            Notification.find({
                $or: [{ receiver: user?.id }, { receiver: 'all' }],
                deleteBy: { $ne: currentUserId },
            })
                .populate('seenBy deleteBy', '_id fullName email'),
            query,
        )
            .search(['title'])
            .filter()
            .sort()
            .paginate()
            .fields();
        const result = await notificationQuery.modelQuery;
        const meta = await notificationQuery.countTotal();
        return { meta, result: formatNotifications(result) };
    }
};

const seeNotification = async (user: JwtPayload) => {
    const userId = user?.id;
    if (!userId) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'User identity not found');
    }

    const io = getIO();
    const receiverFilter = user.role === USER_ROLE.admin
        ? { $or: [{ receiver: USER_ROLE.admin }, { receiver: 'all' }] }
        : { $or: [{ receiver: userId }, { receiver: 'all' }] };

    const result = await Notification.updateMany(
        { ...receiverFilter, seenBy: { $ne: userId } },
        {
            $addToSet: { seenBy: userId },
            $set: { seen: true },
        },
        { runValidators: true }
    );

    if (user?.role === USER_ROLE.admin) {
        const adminNotificationCount = await getAdminNotificationCount(userId);
        io.to(userId).emit('admin-notifications', adminNotificationCount);
        io.to(userId).emit('notifications', adminNotificationCount);
    } else {
        const notificationCount = await getNotificationCount(userId);
        io.to(userId).emit('notifications', notificationCount);
    }

    return result;
};

const deleteNotification = async (id: string, user: JwtPayload) => {
    const userId = user?.id;
    if (!userId) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'User identity not found');
    }

    const notification = await Notification.findById(id);
    if (!notification) {
        throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
    }

    const ownsNotification =
        notification.receiver === userId ||
        (user.role === USER_ROLE.admin && notification.receiver === USER_ROLE.admin);

    if (ownsNotification) {
        const result = await Notification.findByIdAndDelete(id);
        return result
            ? { ...result.toObject(), deleted: true }
            : null;
    }

    if (notification.receiver === 'all') {
        const result = await Notification.findByIdAndUpdate(
            id,
            { $addToSet: { deleteBy: userId } },
            { new: true, runValidators: true }
        ).populate('seenBy deleteBy', '_id fullName email');

        return result
            ? { ...result.toObject(), deleted: true }
            : null;
    }

    throw new AppError(
        httpStatus.FORBIDDEN,
        'You cannot delete this notification'
    );
};

const deleteManyNotifications = async (ids: string[], user: JwtPayload) => {
    const userId = user?.id;
    if (!userId) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'User identity not found');
    }

    const uniqueIds = Array.from(new Set(ids));
    const invalidIds = uniqueIds.filter((id) => !Types.ObjectId.isValid(id));
    // Normalised so the "not found" report compares like with like: isValid()
    // also accepts 12-byte strings, whose hex form is what Mongo stores.
    const validIds = Array.from(
        new Set(
            uniqueIds
                .filter((id) => Types.ObjectId.isValid(id))
                .map((id) => new Types.ObjectId(id).toString())
        )
    );

    if (!validIds.length) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            'No valid notification id was provided'
        );
    }

    const notifications = await Notification.find({ _id: { $in: validIds } })
        .select('_id receiver')
        .lean();

    const foundIds = new Set(notifications.map((notification) => String(notification._id)));
    const notFound = validIds.filter((id) => !foundIds.has(id));

    // A notification addressed to this user (or to admins, when the caller is
    // one) is removed outright. A broadcast is only hidden for them, because
    // everyone else still needs it.
    const removable: any[] = [];
    const hideable: any[] = [];
    const forbidden: string[] = [];

    for (const notification of notifications) {
        const ownsNotification =
            notification.receiver === userId ||
            (user.role === USER_ROLE.admin &&
                notification.receiver === USER_ROLE.admin);

        if (ownsNotification) {
            removable.push(notification._id);
        } else if (notification.receiver === 'all') {
            hideable.push(notification._id);
        } else {
            forbidden.push(String(notification._id));
        }
    }

    const [removed, hidden] = await Promise.all([
        removable.length
            ? Notification.deleteMany({ _id: { $in: removable } })
            : Promise.resolve({ deletedCount: 0 }),
        hideable.length
            ? Notification.updateMany(
                { _id: { $in: hideable } },
                { $addToSet: { deleteBy: userId } },
                { runValidators: true }
            )
            : Promise.resolve({ modifiedCount: 0 }),
    ]);

    const io = getIO();
    if (user?.role === USER_ROLE.admin) {
        const adminNotificationCount = await getAdminNotificationCount(userId);
        io.to(userId).emit('admin-notifications', adminNotificationCount);
        io.to(userId).emit('notifications', adminNotificationCount);
    } else {
        const notificationCount = await getNotificationCount(userId);
        io.to(userId).emit('notifications', notificationCount);
    }

    return {
        requested: ids.length,
        deletedCount: removed.deletedCount ?? 0,
        hiddenCount: (hidden as any).modifiedCount ?? 0,
        skipped: { invalidIds, notFound, forbidden },
    };
};

const seeSingleNotification = async (id: string, user: JwtPayload) => {
    const userId = user?.id;
    if (!userId) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'User identity not found');
    }

    const notification = await Notification.findById(id);
    if (!notification) {
        throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
    }

    let result;
    const io = getIO();
    const canSeeNotification =
        notification.receiver === 'all' ||
        notification.receiver === userId ||
        (user.role === USER_ROLE.admin && notification.receiver === USER_ROLE.admin);

    if (!canSeeNotification) {
        throw new AppError(httpStatus.FORBIDDEN, 'You cannot access this notification');
    }
    
    if (user?.role === USER_ROLE.admin) {
        result = await Notification.findByIdAndUpdate(
            id,
            {
                $addToSet: { seenBy: userId },
                $set: { seen: true },
            },
            { new: true, runValidators: true }
        ).populate('seenBy deleteBy', '_id fullName email');
        const adminNotificationCount = await getAdminNotificationCount(userId);
        io.to(userId).emit('admin-notifications', adminNotificationCount);
        io.to(userId).emit('notifications', adminNotificationCount);
    } else {
        result = await Notification.findByIdAndUpdate(
            id,
            {
                $addToSet: { seenBy: userId },
                $set: { seen: true },
            },
            { new: true, runValidators: true }
        ).populate('seenBy deleteBy', '_id fullName email');
        const notificationCount = await getNotificationCount(userId);
        io.to(userId).emit('notifications', notificationCount);
    }
    
    return result;
};

const notificationService = {
    getAllNotificationFromDB,
    seeNotification,
    seeSingleNotification,
    deleteNotification,
    deleteManyNotifications,
};

export default notificationService;
