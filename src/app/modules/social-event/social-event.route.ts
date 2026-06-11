import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import validateRequest from '../../middleware/validateRequest';
import { SocialEventValidations } from './social-event.validation';
import { SocialEventControllers } from './social-event.controller';
import { uploadFile } from '../../helper/multer-s3-uploader';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLE.admin),
  uploadFile(),
  (req, res, next) => {
    if (req.body.data) {
      req.body = JSON.parse(req.body.data);
    }
    next();
  },
  validateRequest(SocialEventValidations.createSocialEventValidationSchema),
  SocialEventControllers.createSocialEvent
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.user),
  SocialEventControllers.getAllSocialEvents
);

router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.user),
  SocialEventControllers.getSingleSocialEvent
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin),
  uploadFile(),
  (req, res, next) => {
    if (req.body.data) {
      req.body = JSON.parse(req.body.data);
    }
    next();
  },
  validateRequest(SocialEventValidations.updateSocialEventValidationSchema),
  SocialEventControllers.updateSocialEvent
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin),
  SocialEventControllers.deleteSocialEvent
);

router.post(
  '/join/:id',
  auth(USER_ROLE.user),
  SocialEventControllers.joinSocialEvent
);

export const SocialEventRoutes = router;
