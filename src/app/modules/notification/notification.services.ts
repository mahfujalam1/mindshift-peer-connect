/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
    if (user?.role === USER_ROLE.admin) {
        const notificationQuery = new QueryBuilder(
            Notification.find({ $or: [{ receiver: USER_ROLE.admin }, { receiver: 'all' }] }),
            query,
        )
            .search(['title'])
            .filter()
            .sort()
            .paginate()
            .fields();
        const result = await notificationQuery.modelQuery;
        const meta = await notificationQuery.countTotal();
        return { meta, result };
    } else {
        const notificationQuery = new QueryBuilder(
            Notification.find({ $or: [{ receiver: user?.id }, { receiver: 'all' }] }),
            query,
        )
            .search(['title'])
            .filter()
            .sort()
            .paginate()
            .fields();
        const result = await notificationQuery.modelQuery;
        const meta = await notificationQuery.countTotal();
        return { meta, result };
    }
};

const seeNotification = async (user: JwtPayload) => {
    let result;
    const io = getIO();
    if (user?.role === USER_ROLE.admin) {
        result = await Notification.updateMany(
            { $or: [{ receiver: USER_ROLE.admin }, { receiver: 'all' }] },
            { $addToSet: { seenBy: user.profileId } },
            { runValidators: true }
        );
        const adminUnseenNotificationCount = await getAdminNotificationCount();
        const notificationCount = await getNotificationCount();
        io.emit('admin-notifications', adminUnseenNotificationCount);
        io.emit('notifications', notificationCount);
    }
    if (user?.role !== USER_ROLE.admin) {
        result = await Notification.updateMany(
            { $or: [{ receiver: user.id }, { receiver: 'all' }] },
            { $addToSet: { seenBy: user.id } },
            { runValidators: true }
        );
    }
    const notificationCount = await getNotificationCount(user.id);
    io.to(user.profileId.toString()).emit('notifications', notificationCount);
    return result;
};

const deleteNotification = async (id: string, profileId: string) => {
    const notification = await Notification.findById(id);
    if (!notification) {
        throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
    }
    if (notification.receiver == profileId) {
        const result = await Notification.findByIdAndDelete(id);
        return result;
    } else if (notification.receiver == 'all') {
        const result = await Notification.findByIdAndUpdate(id, {
            $addToSet: { deleteBy: profileId },
        });
        return result;
    } else {
        return null;
    }
};

const seeSingleNotification = async (id: string, user: JwtPayload) => {
    const notification = await Notification.findById(id);
    if (!notification) {
        throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
    }

    let result;
    const io = getIO();
    
    if (user?.role === USER_ROLE.admin) {
        result = await Notification.findByIdAndUpdate(
            id,
            { $addToSet: { seenBy: user.profileId } },
            { new: true, runValidators: true }
        );
        const adminUnseenNotificationCount = await getAdminNotificationCount();
        const notificationCount = await getNotificationCount();
        io.emit('admin-notifications', adminUnseenNotificationCount);
        io.emit('notifications', notificationCount);
    } else {
        result = await Notification.findByIdAndUpdate(
            id,
            { $addToSet: { seenBy: user.id } },
            { new: true, runValidators: true }
        );
        const notificationCount = await getNotificationCount(user.id);
        io.to(user.profileId.toString()).emit('notifications', notificationCount);
    }
    
    return result;
};

const notificationService = {
    getAllNotificationFromDB,
    seeNotification,
    seeSingleNotification,
    deleteNotification,
};

export default notificationService;
