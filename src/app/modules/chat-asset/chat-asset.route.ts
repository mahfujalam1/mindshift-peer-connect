import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import { ChatAssetControllers } from './chat-asset.controller';
import { uploadFile } from '../../helper/multer-s3-uploader';

const router = Router();

router.post(
  '/create',
  auth(USER_ROLE.admin),
  uploadFile(),
  ChatAssetControllers.createChatAsset
);

router.get(
  '/all',
  auth(USER_ROLE.user, USER_ROLE.admin),
  ChatAssetControllers.getAllChatAssets
);

router.get(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.admin),
  ChatAssetControllers.getSingleChatAsset
);

export const ChatAssetRoutes = router;
