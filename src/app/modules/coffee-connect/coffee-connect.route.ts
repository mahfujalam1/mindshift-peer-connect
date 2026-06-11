import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import validateRequest from '../../middleware/validateRequest';
import { CoffeeConnectValidations } from './coffee-connect.validation';
import { CoffeeConnectControllers } from './coffee-connect.controller';
import { uploadFile } from '../../helper/multer-s3-uploader';

const router = express.Router();

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
  validateRequest(CoffeeConnectValidations.createCoffeeConnectValidationSchema),
  CoffeeConnectControllers.createCoffeeConnect
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.user),
  CoffeeConnectControllers.getAllCoffeeConnects
);

router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.user),
  CoffeeConnectControllers.getSingleCoffeeConnect
);

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
  validateRequest(CoffeeConnectValidations.updateCoffeeConnectValidationSchema),
  CoffeeConnectControllers.updateCoffeeConnect
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin),
  CoffeeConnectControllers.deleteCoffeeConnect
);

router.post(
  '/join/:id',
  auth(USER_ROLE.user),
  CoffeeConnectControllers.joinCoffeeConnect
);

export const CoffeeConnectRoutes = router;
