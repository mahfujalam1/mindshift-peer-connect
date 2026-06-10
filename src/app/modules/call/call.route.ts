// src/app/modules/call/call.route.ts
import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import { CallController } from './call.controller';

const router = Router();

// Endpoint to generate LiveKit token
router.post('/token', auth(USER_ROLE.user, USER_ROLE.admin), CallController.getToken);

export const CallRoutes = router;
