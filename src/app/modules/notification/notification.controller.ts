
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import notificationService from './notification.services';

const getAllNotification = catchAsync(async (req, res) => {
    const result = await notificationService.getAllNotificationFromDB(
        req?.query,
        req?.user
    );

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Notification retrieved successfully',
        data: result,
    });
});

const seeNotification = catchAsync(async (req, res) => {
    const result = await notificationService.seeNotification(req?.user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Notification seen successfully',
        data: result,
    });
});

const seeSingleNotification = catchAsync(async (req, res) => {
    const result = await notificationService.seeSingleNotification(
        req.params.id,
        req?.user
    );

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Notification marked as seen successfully',
        data: result,
    });
});

const deleteNotification = catchAsync(async (req, res) => {
    const result = await notificationService.deleteNotification(
        req.params.id,
        req?.user
    );

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Notification deleted successfully',
        data: result,
    });
});

const notificationController = {
    getAllNotification,
    seeNotification,
    seeSingleNotification,
    deleteNotification,
};

export default notificationController;
