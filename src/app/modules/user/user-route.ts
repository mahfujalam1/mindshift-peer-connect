import { Router } from "express";
import { UserControllers } from "./user-controller";
import validateRequest from "../../middleware/validateRequest";
import { USER_ROLE } from "./user-constant";
import userValidations from "./user-validation";
import auth from "../../middleware/auth";
import { uploadFile } from "../../helper/multer-s3-uploader";

const router = Router();

router.post("/signup", validateRequest(userValidations.UserValidationSchema), UserControllers.createUser);

router.post(
    '/verify-code',
    validateRequest(userValidations.verifyCodeValidationSchema),
    UserControllers.verifyCode
);

router.post(
    '/resend-verify-code',
    validateRequest(userValidations.resendVerifyCodeSchema),
    UserControllers.resendVerifyCode
);


router.patch(
    '/update-profile',
    auth(USER_ROLE.admin, USER_ROLE.user),
    uploadFile(),
    UserControllers.updateProfile
);

router.get(
    '/get-my-profile',
    auth(USER_ROLE.user, USER_ROLE.admin, ),
    UserControllers.getMyProfile
);

router.patch('/block-user/:userId', 
    auth(USER_ROLE.admin, USER_ROLE.user), 
    UserControllers.blockUser
);

router.get(
    '/get-single-user/:id',
    auth(USER_ROLE.admin, USER_ROLE.user),
    UserControllers.getSingleUser,
);

router.get(
    '/get-all-users',
    auth(USER_ROLE.admin),
    UserControllers.getAllUser,
);

router.get(
    '/referral-network/my',
    auth(USER_ROLE.user, USER_ROLE.admin),
    UserControllers.getMyReferralNetwork
);

router.get(
    '/referral-network/added-me',
    auth(USER_ROLE.user, USER_ROLE.admin),
    UserControllers.getAddedMeToReferralNetwork
);

router.post(
    '/referral-network/add/:targetUserId',
    auth(USER_ROLE.user, USER_ROLE.admin),
    UserControllers.addToReferralNetwork
);

router.get(
    '/referral-network/browse',
    auth(USER_ROLE.user, USER_ROLE.admin),
    UserControllers.getBrowsableUsersForReferral
);

export const UserRoutes = router;
