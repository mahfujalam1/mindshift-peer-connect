import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import validateRequest from '../../middleware/validateRequest';
import { GoverningBodyValidations } from './governingBody.validation';
import { GoverningBodyControllers } from './governingBody.controller';

const router = Router();

router.post(
  '/',
  auth(USER_ROLE.admin),
  validateRequest(GoverningBodyValidations.createGoverningBodyValidationSchema),
  GoverningBodyControllers.createGoverningBody
);

router.get('/', GoverningBodyControllers.getAllGoverningBodies);

router.get('/:id', GoverningBodyControllers.getSingleGoverningBody);

router.get('/by-profession/:professionId', GoverningBodyControllers.getGoverningBodiesByProfession);

router.patch(
  '/:id',
  auth(USER_ROLE.admin),
  validateRequest(GoverningBodyValidations.updateGoverningBodyValidationSchema),
  GoverningBodyControllers.updateGoverningBody
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin),
  GoverningBodyControllers.deleteGoverningBody
);

export const GoverningBodyRoutes = router;
