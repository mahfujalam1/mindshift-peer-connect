import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import validateRequest from '../../middleware/validateRequest';
import { ProfessionValidations } from './profession.validation';
import { ProfessionControllers } from './profession.controller';

const router = Router();

router.post(
  '/',
  auth(USER_ROLE.admin),
  validateRequest(ProfessionValidations.createProfessionValidationSchema),
  ProfessionControllers.createProfession
);

router.get('/', ProfessionControllers.getAllProfessions);

router.get('/:id', ProfessionControllers.getSingleProfession);

router.patch(
  '/:id',
  auth(USER_ROLE.admin),
  validateRequest(ProfessionValidations.updateProfessionValidationSchema),
  ProfessionControllers.updateProfession
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin),
  ProfessionControllers.deleteProfession
);

export const ProfessionRoutes = router;
