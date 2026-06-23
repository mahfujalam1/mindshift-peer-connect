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
  EventControllers.acceptEventRequest
);

router.patch(
  '/request/reject/:id',
  auth(USER_ROLE.admin),
  EventControllers.rejectEventRequest
);

// Join / Leave — pass eventType as query param e.g. /join/:id?eventType=CoffeeConnect
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

// My joined events — supports ?eventType=CoffeeConnect&available=true
router.get(
  '/my-joined-events',
  auth(USER_ROLE.user, USER_ROLE.admin),
  EventControllers.getMyJoinedEvents
);

export const EventRoutes = router;
