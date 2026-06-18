// src/app/modules/expertise/expertise.route.ts
import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import { ExpertiseController } from './expertise.controller';

const router = Router();

// All routes are protected – users manage their own expertise entries
router.post('/', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.create);
router.get('/', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.list);
router.get('/my-expertise', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.getMyExpertise);
router.get('/:id', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.getById);
router.patch('/:id', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.update);
router.delete('/:id', auth(USER_ROLE.user, USER_ROLE.admin), ExpertiseController.remove);

export const ExpertiseRoutes = router;
