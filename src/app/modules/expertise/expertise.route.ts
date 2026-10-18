// src/app/modules/expertise/expertise.route.ts
import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import { ExpertiseController } from './expertise.controller';

import { uploadFile } from '../../helper/multer-s3-uploader';

const router = Router();

// Admin manages expertise master list; users can view
router.post(
  '/',
  auth(USER_ROLE.admin),
  uploadFile(),
  (req, res, next) => {
    if (req.body.data) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch (err) {
        // fallback if already parsed or invalid
      }
    }
    next();
  },
  ExpertiseController.create
);
router.get('/', ExpertiseController.list);
router.get('/admin-expertise', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.getAdminExpertise);
router.get('/my-expertise', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.getMyExpertise);
router.get('/:id', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.getById);
router.patch(
  '/:id',
  auth(USER_ROLE.admin),
  uploadFile(),
  (req, res, next) => {
    if (req.body.data) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch (err) {
        // fallback if already parsed or invalid
      }
    }
    next();
  },
  ExpertiseController.update
);
router.delete('/:id', auth(USER_ROLE.admin), ExpertiseController.remove);

export const ExpertiseRoutes = router;
