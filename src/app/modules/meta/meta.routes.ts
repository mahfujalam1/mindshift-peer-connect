import express from 'express';
import MetaController from './meta.controller';
import { USER_ROLE } from '../user/user-constant';
import auth from '../../middleware/auth';

const router = express.Router();

router.get(
  '/dashboard-meta-data',
  auth(USER_ROLE.admin),
  MetaController.getDashboardMetaData,
);

router.get(
  '/user-chart-data',
  auth(USER_ROLE.admin),
  MetaController.getUserChartData,
);

export const metaRoutes = router;
