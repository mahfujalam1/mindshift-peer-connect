import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../user/user-constant';
import { LiveDiscussionControllers } from './live-discussion.controller';
import { LiveDiscussionValidations } from './live-discussion.validation';

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

router.get(
  '/my-joined-rooms',
  auth(USER_ROLE.user, USER_ROLE.admin),
  LiveDiscussionControllers.myJoinedRooms
);

router.get(
  '/messages/:roomId/around/:messageId',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(LiveDiscussionValidations.messagesAroundValidationSchema),
  LiveDiscussionControllers.getMessagesAround
);

router.get(
  '/messages/:roomId',
  auth(USER_ROLE.user, USER_ROLE.admin),
  LiveDiscussionControllers.getMessages
);

router.post(
  '/messages/:messageId/react',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(LiveDiscussionValidations.reactToLiveMessageValidationSchema),
  LiveDiscussionControllers.reactToMessage
);

export const LiveDiscussionRoutes = router;
