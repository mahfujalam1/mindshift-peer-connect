import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import validateRequest from '../../middleware/validateRequest';
import { ProfessionValidations } from './profession.validation';
import { ProfessionControllers } from './profession.controller';
import { uploadFile } from '../../helper/multer-s3-uploader';

const router = Router();

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
  validateRequest(ProfessionValidations.createProfessionValidationSchema),
  ProfessionControllers.createProfession
);

router.get('/', ProfessionControllers.getAllProfessions);

router.get('/:id', ProfessionControllers.getSingleProfession);

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
  validateRequest(ProfessionValidations.updateProfessionValidationSchema),
  ProfessionControllers.updateProfession
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin),
  ProfessionControllers.deleteProfession
);

export const ProfessionRoutes = router;
