import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import { LiveDiscussionControllers } from './live-discussion.controller';

const router = express.Router();

router.get(
  '/',
  auth(USER_ROLE.user, USER_ROLE.admin),
  LiveDiscussionControllers.getAllRooms
);

router.post(
  '/join/:roomId',
  auth(USER_ROLE.user, USER_ROLE.admin),
  LiveDiscussionControllers.joinRoom
);

router.get(
  '/room/:roomId',
  auth(USER_ROLE.user, USER_ROLE.admin),
  LiveDiscussionControllers.getRoomDetails
);


router.get('/my-joined-rooms', auth(USER_ROLE.user, USER_ROLE.admin), LiveDiscussionControllers.myJoinedRooms);

router.get(
  '/messages/:roomId',
  auth(USER_ROLE.user, USER_ROLE.admin),
  LiveDiscussionControllers.getMessages
);

export const LiveDiscussionRoutes = router;
