
import express from 'express';
import notificationController from './notification.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
const router = express.Router();

router.get(
    '/get-notifications',
    auth(
        USER_ROLE.admin,
        USER_ROLE.user,
    ),
    notificationController.getAllNotification
);
router.patch(
    '/see-notifications',
    auth(
        USER_ROLE.admin,
        USER_ROLE.user,
    ),
    notificationController.seeNotification
);

router.delete(
    '/delete-notification/:id',
    auth(USER_ROLE.user, USER_ROLE.admin),
    notificationController.deleteNotification
);


router.get(
    '/get-notifications/:id',
    auth(USER_ROLE.user, USER_ROLE.admin),
    notificationController.deleteNotification
);
//
export const notificationRoutes = router;
