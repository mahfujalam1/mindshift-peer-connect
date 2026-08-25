import express from 'express';
import { ManageController } from './manage.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';

const router = express.Router();

router.patch(
  '/about-us',
  auth(USER_ROLE.admin),
  ManageController.addAboutUs,
);
router.post('/add-faq', auth(USER_ROLE.admin), ManageController.addFAQ);
router.patch(
  '/terms-conditions',
  auth(USER_ROLE.admin),
  ManageController.addTermsConditions,
);
// router.post(
//   '/add-partner',
//   auth(USER_ROLE.admin),
//   ManageController.addPartner,
// );
// router.post(
//   '/add-contact-us',
//   auth(USER_ROLE.admin),
//   ManageController.addContactUs,
// );
router.patch(
  '/privacy-policy',
  auth(USER_ROLE.admin),
  ManageController.addPrivacyPolicy,
);
// router.post(
//   '/add-slider',
//   auth(USER_ROLE.admin),
//   uploadFile(),
//   ManageController.addSlider,
// );
router.get('/get-privacy-policy', ManageController.getPrivacyPolicy);
// router.get('/get-partner', ManageController.getPartner);
// router.get('/get-slider', ManageController.getSlider);
router.get('/get-faq', ManageController.getFAQ);
router.get('/get-about-us', ManageController.getAboutUs);
router.get('/get-terms-conditions', ManageController.getTermsConditions);
// router.get('/get-contact-us', ManageController.getContactUs);
// router.patch(
//   '/edit-partner/:id',
//   auth(USER_ROLE.admin),
//   ManageController.editPartner,
// );
// router.patch(
//   '/edit-slider/:id',
//   auth(USER_ROLE.admin),
//   uploadFile(),
//   ManageController.editSlider,
// );
router.patch(
  '/edit-faq/:id',
  auth(USER_ROLE.admin),
  ManageController.editFAQ,
);

// router.patch(
//   '/edit-contact-us/:id',
//   auth(USER_ROLE.admin),
//   ManageController.editContactUs,
// );
// router.delete(
//   '/delete-slider/:id',
//   auth(USER_ROLE.admin),
//   ManageController.deleteSlider,
// );
router.delete(
  '/delete-faq/:id',
  auth(USER_ROLE.admin),
  ManageController.deleteFAQ,
);
// router.delete(
//   '/delete-contact-us/:id',
//   auth(USER_ROLE.admin),
//   ManageController.deleteContactUs,
// );
// router.delete(
//   '/delete-partner/:id',
//   auth(USER_ROLE.admin),
//   ManageController.deletePartner,
// );
export const ManageRoutes = router;
