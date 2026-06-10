import express from 'express';
import { ManageController } from './manage.controller';
import { uploadFile } from '../../helper/fileUploader';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user-constant';

const router = express.Router();

router.post(
  '/add-about-us',
  auth(USER_ROLE.admin),
  ManageController.addAboutUs,
);
router.post('/add-faq', auth(USER_ROLE.admin), ManageController.addFAQ);
router.post(
  '/add-terms-conditions',
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
router.post(
  '/add-privacy-policy',
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
router.patch(
  '/edit-privacy-policy/:id',
  auth(USER_ROLE.admin),
  ManageController.editPrivacyPolicy,
);
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
router.patch(
  '/edit-about-us/:id',
  auth(USER_ROLE.admin),
  ManageController.editAboutUs,
);

router.patch(
  '/edit-terms-conditions/:id',
  auth(USER_ROLE.admin),
  ManageController.editTermsConditions,
);

// router.patch(
//   '/edit-contact-us/:id',
//   auth(USER_ROLE.admin),
//   ManageController.editContactUs,
// );
router.delete(
  '/delete-about-us/:id',
  auth(USER_ROLE.admin),
  ManageController.deleteAboutUs,
);
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
router.delete(
  '/delete-privacy-policy/:id',
  auth(USER_ROLE.admin),
  ManageController.deletePrivacyPolicy,
);
// router.delete(
//   '/delete-partner/:id',
//   auth(USER_ROLE.admin),
//   ManageController.deletePartner,
// );
router.delete(
  '/delete-terms-conditions/:id',
  auth(USER_ROLE.admin),
  ManageController.deleteTermsConditions,
);
export const ManageRoutes = router;
