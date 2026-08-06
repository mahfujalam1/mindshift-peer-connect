import { Router } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../user/user-constant';
import { CustomerSupportControllers } from './customer-support.controller';
import { CustomerSupportValidations } from './customer-support.validation';

const router = Router();

router.post(
  '/',
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(CustomerSupportValidations.createCustomerSupportSchema),
  CustomerSupportControllers.createTicket
);

router.get('/my', auth(USER_ROLE.user, USER_ROLE.admin), CustomerSupportControllers.getMyTickets);
router.get('/', auth(USER_ROLE.admin), CustomerSupportControllers.getAllTickets);

router.patch(
  '/:id/reply',
  auth(USER_ROLE.admin),
  validateRequest(CustomerSupportValidations.replyCustomerSupportSchema),
  CustomerSupportControllers.replyToTicket
);

router.patch(
  '/:id/close',
  auth(USER_ROLE.user, USER_ROLE.admin),
  CustomerSupportControllers.closeTicket
);

router.patch(
  '/:id',
  auth(USER_ROLE.user),
  validateRequest(CustomerSupportValidations.updateCustomerSupportSchema),
  CustomerSupportControllers.updateMyTicket
);

router.get('/:id', auth(USER_ROLE.user, USER_ROLE.admin), CustomerSupportControllers.getTicketById);
router.delete('/:id', auth(USER_ROLE.user, USER_ROLE.admin), CustomerSupportControllers.deleteTicket);

export const CustomerSupportRoutes = router;
