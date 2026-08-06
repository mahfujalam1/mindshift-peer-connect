import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import { ProfileViewControllers } from './profile-view.controller';

const router = Router();

router.get('/my-views', auth(USER_ROLE.user, USER_ROLE.admin), ProfileViewControllers.getMyProfileViews);

export const ProfileViewRoutes = router;
