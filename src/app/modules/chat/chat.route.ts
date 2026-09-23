import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';
import { ChatControllers } from './chat.controller';
import { uploadFile } from '../../helper/multer-s3-uploader';
import validateRequest from '../../middleware/validateRequest';
import { ChatValidations } from './chat.validation';

const router = Router();
const settingsRouter = Router();

router.post(
  '/create-conversation',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(ChatValidations.createConversationValidationSchema),
  ChatControllers.createConversation
);

router.get(
  '/conversations',
  auth(USER_ROLE.user, USER_ROLE.admin),
  ChatControllers.getMyConversations
);

router.get(
  '/messages/:conversationId/around/:messageId',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(ChatValidations.messagesAroundValidationSchema),
  ChatControllers.getMessagesAround
);

router.get(
  '/messages/:conversationId',
  auth(USER_ROLE.user, USER_ROLE.admin),
  ChatControllers.getMessageHistory
);

router.post(
  '/upload-file',
  auth(USER_ROLE.user, USER_ROLE.admin),
  uploadFile(),
  ChatControllers.uploadChatFile
);

router.patch(
  '/messages/:messageId',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(ChatValidations.updateMessageValidationSchema),
  ChatControllers.updateMessage
);

router.post(
  '/messages/:messageId/react',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(ChatValidations.reactToMessageValidationSchema),
  ChatControllers.reactToMessage
);

settingsRouter.get(
  '/chat',
  auth(USER_ROLE.user, USER_ROLE.admin),
  ChatControllers.getChatSettings
);

settingsRouter.patch(
  '/chat',
  auth(USER_ROLE.admin),
  validateRequest(ChatValidations.updateChatSettingValidationSchema),
  ChatControllers.updateChatSetting
);

export const ChatRoutes = router;
export const ChatSettingsRoutes = settingsRouter;
