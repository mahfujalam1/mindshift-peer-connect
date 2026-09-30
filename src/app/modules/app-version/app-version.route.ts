import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import validateRequest from '../../middleware/validateRequest';
import { AppVersionValidations } from './app-version.validation';
import { AppVersionControllers } from './app-version.controller';

const router = Router();

router.get(
  '/check',
  validateRequest(AppVersionValidations.checkAppVersionValidationSchema),
  AppVersionControllers.checkAppVersion
);

router.get('/', auth(USER_ROLE.admin), AppVersionControllers.getAppVersions);

router.put(
  '/',
  auth(USER_ROLE.admin),
  validateRequest(AppVersionValidations.upsertAppVersionsValidationSchema),
  AppVersionControllers.upsertAppVersions
);

router.get(
  '/:platform',
  auth(USER_ROLE.admin),
  validateRequest(AppVersionValidations.platformParamValidationSchema),
  AppVersionControllers.getAppVersionByPlatform
);

router.patch(
  '/:platform',
  auth(USER_ROLE.admin),
  validateRequest(AppVersionValidations.updateAppVersionValidationSchema),
  AppVersionControllers.updateAppVersion
);

export const AppVersionRoutes = router;
