import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import validateRequest from '../../middleware/validateRequest';
import { ConsultValidations } from './consult.validation';
import { ConsultControllers } from './consult.controller';

const router = Router();

router.post(
  '/',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(ConsultValidations.createConsultValidationSchema),
  ConsultControllers.createConsult
);

router.post(
  '/create',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(ConsultValidations.createConsultValidationSchema),
  ConsultControllers.createConsult
);

router.get(
  '/',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(ConsultValidations.getAllConsultsValidationSchema),
  ConsultControllers.getAllConsults
);

router.get(
  '/all',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(ConsultValidations.getAllConsultsValidationSchema),
  ConsultControllers.getAllConsults
);

router.get(
  '/my-consults',
  auth(USER_ROLE.user, USER_ROLE.admin),
  ConsultControllers.getMyConsults
);

router.patch(
  '/available-to-chat/:id',
  auth(USER_ROLE.user, USER_ROLE.admin),
  ConsultControllers.availableToChat
);

router.get(
  '/interested-list/:id',
  auth(USER_ROLE.user, USER_ROLE.admin),
  ConsultControllers.getInterestedList
);

router.get(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.admin),
  ConsultControllers.getSingleConsult
);

router.patch(
  '/:consultId',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(ConsultValidations.updateConsultValidationSchema),
  ConsultControllers.updateConsult
);

router.delete(
  '/:consultId',
  auth(USER_ROLE.user, USER_ROLE.admin),
  ConsultControllers.deleteConsult
);

export const ConsultRoutes = router;
