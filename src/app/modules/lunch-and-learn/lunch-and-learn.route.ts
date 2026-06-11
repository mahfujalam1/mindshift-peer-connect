import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import validateRequest from '../../middleware/validateRequest';
import { LunchAndLearnValidations } from './lunch-and-learn.validation';
import { LunchAndLearnControllers } from './lunch-and-learn.controller';
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
  validateRequest(LunchAndLearnValidations.createLunchAndLearnValidationSchema),
  LunchAndLearnControllers.createLunchAndLearn
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.user),
  LunchAndLearnControllers.getAllLunchAndLearns
);

router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.user),
  LunchAndLearnControllers.getSingleLunchAndLearn
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
  validateRequest(LunchAndLearnValidations.updateLunchAndLearnValidationSchema),
  LunchAndLearnControllers.updateLunchAndLearn
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin),
  LunchAndLearnControllers.deleteLunchAndLearn
);

router.post(
  '/join/:id',
  auth(USER_ROLE.user),
  LunchAndLearnControllers.joinLunchAndLearn
);

export const LunchAndLearnRoutes = router;
