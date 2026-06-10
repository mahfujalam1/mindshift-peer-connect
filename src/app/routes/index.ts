import { Router } from 'express';
import { UserRoutes } from '../modules/user/user-route';
import { AuthRoutes } from '../modules/auth/auth-route';
import { ManageRoutes } from '../modules/manage-web/manage.routes';
import { notificationRoutes } from '../modules/notification/notification.routes';
import { metaRoutes } from '../modules/meta/meta.routes';
import { InvoiceRoutes } from '../modules/invoice/invoice.route';
import { ConsultRoutes } from '../modules/consult/consult.route';
import { ChatRoutes } from '../modules/chat/chat.route';
import { ChatAssetRoutes } from '../modules/chat-asset/chat-asset.route';
import { ExpertiseRoutes } from '../modules/expertise/expertise.route';
import { CallRoutes } from '../modules/call/call.route';

const router = Router();

const moduleRoutes = [
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/manage-web',
    route: ManageRoutes,
  },
  {
    path: '/meta',
    route: metaRoutes,
  },
  {
    path: '/notification',
    route: notificationRoutes,
  },
  {
    path: '/invoice',
    route: InvoiceRoutes,
  },
  {
    path: '/consult',
    route: ConsultRoutes,
  },
  {
    path: '/chat',
    route: ChatRoutes,
  },
  {
    path: '/chat-assets',
    route: ChatAssetRoutes,
  },
  {
    path: '/expertise',
    route: ExpertiseRoutes,
  },
  {
    path: '/call',
    route: CallRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
