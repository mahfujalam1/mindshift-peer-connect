import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import { EventControllers } from './event.controller';
import validateRequest from '../../middleware/validateRequest';
import { EventValidations } from './event.validation';

const router = express.Router();

// Event Request Routes
router.post(
  '/request',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(EventValidations.createEventRequestValidationSchema),
  EventControllers.createEventRequest
);

router.get(
  '/request',
  auth(USER_ROLE.admin),
  EventControllers.getAllEventRequests
);

router.get(
  '/request/:id',
  auth(USER_ROLE.admin),
  EventControllers.getSingleEventRequest
);

router.patch(
  '/request/accept/:id',
  auth(USER_ROLE.admin),
  validateRequest(EventValidations.acceptEventRequestValidationSchema),
  EventControllers.acceptEventRequest
);

router.patch(
  '/request/reject/:id',
  auth(USER_ROLE.admin),
  EventControllers.rejectEventRequest
);

// Event Routes
router.get(
  '/',
  auth(USER_ROLE.user, USER_ROLE.admin),
  EventControllers.getAllEvents
);

router.get(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.admin),
  EventControllers.getSingleEvent
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin),
  EventControllers.updateEvent
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin),
  EventControllers.deleteEvent
);

router.post(
  '/join/:id',
  auth(USER_ROLE.user, USER_ROLE.admin),
  EventControllers.joinEvent
);

router.post(
  '/leave/:id',
  auth(USER_ROLE.user, USER_ROLE.admin),
  EventControllers.leaveEvent
);

export const EventRoutes = router;
