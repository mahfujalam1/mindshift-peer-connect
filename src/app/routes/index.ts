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
import { CoffeeConnectRoutes } from '../modules/coffee-connect/coffee-connect.route';
import { LunchAndLearnRoutes } from '../modules/lunch-and-learn/lunch-and-learn.route';
import { SocialEventRoutes } from '../modules/social-event/social-event.route';
import { ReportRoutes } from '../modules/report/report.route';
import { LiveDiscussionRoutes } from '../modules/live-discussion/live-discussion.route';
import { EventRoutes } from '../modules/event/event.route';
import { ProfessionRoutes } from '../modules/profession/profession.route';
import { GoverningBodyRoutes } from '../modules/governingBody/governingBody.route';
import { DashboardRoutes } from '../modules/dashboard/dashboard.route';

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
    path: '/profession',
    route: ProfessionRoutes,
  },
  {
    path: '/governing-body',
    route: GoverningBodyRoutes,
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
  {
    path: '/coffee-connect',
    route: CoffeeConnectRoutes,
  },
  {
    path: '/lunch-and-learn',
    route: LunchAndLearnRoutes,
  },
  {
    path: '/social-event',
    route: SocialEventRoutes,
  },
  {
    path: '/report',
    route: ReportRoutes,
  },
  {
    path: '/live-discussion',
    route: LiveDiscussionRoutes,
  },
  {
    path: '/event',
    route: EventRoutes,
  },
  {
    path: '/dashboard',
    route: DashboardRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
