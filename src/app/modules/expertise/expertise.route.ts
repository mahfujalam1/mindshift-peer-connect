// src/app/modules/expertise/expertise.route.ts
import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import { ExpertiseController } from './expertise.controller';

import { uploadFile } from '../../helper/multer-s3-uploader';

const router = Router();

// Admin manages expertise master list; users can view
router.post('/', auth(USER_ROLE.admin), uploadFile(), ExpertiseController.create);
router.get('/', ExpertiseController.list);
router.get('/admin-expertise', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.getAdminExpertise);
router.get('/my-expertise', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.getMyExpertise);
router.get('/:id', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.getById);
router.patch('/:id', auth(USER_ROLE.admin), ExpertiseController.update);
router.delete('/:id', auth(USER_ROLE.admin), ExpertiseController.remove);

export const ExpertiseRoutes = router;
