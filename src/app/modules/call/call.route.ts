// src/app/modules/call/call.route.ts
import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import { CallController } from './call.controller';
import validateRequest from '../../middleware/validateRequest';
import { CallValidations } from './call.validation';

const router = Router();
const settingsRouter = Router();

// Endpoint to generate LiveKit token
settingsRouter.get(
  '/call',
  auth(USER_ROLE.user, USER_ROLE.admin),
  CallController.getSettings,
);

settingsRouter.patch(
  '/call',
  auth(USER_ROLE.admin),
  validateRequest(CallValidations.updateCallSettingSchema),
  CallController.updateSetting,
);

router.post(
  '/token',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(CallValidations.generateTokenSchema),
  CallController.getToken,
);

export const CallRoutes = router;
export const CallSettingsRoutes = settingsRouter;
