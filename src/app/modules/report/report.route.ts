import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import validateRequest from '../../middleware/validateRequest';
import { ReportValidations } from './report.validation';
import { ReportControllers } from './report.controller';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(ReportValidations.createReportValidationSchema),
  ReportControllers.createReport
);

router.get(
  '/',
  auth(USER_ROLE.admin),
  ReportControllers.getAllReports
);

router.get(
  '/:id',
  auth(USER_ROLE.admin),
  ReportControllers.getSingleReport
);

router.patch(
  '/resolve/:id',
  auth(USER_ROLE.admin),
  ReportControllers.resolveReport
);

router.patch(
  '/reject/:id',
  auth(USER_ROLE.admin),
  ReportControllers.rejectReport
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin),
  ReportControllers.deleteReport
);

export const ReportRoutes = router;
