import { Router } from "express";
import { AuthControllers } from "./auth-controller";
import validateRequest from "../../middleware/validateRequest";
import { authValidations } from "./auth-validation";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user-constant";

const router = Router();
router.post(
  "/signin",
  validateRequest(authValidations.loginValidation),
  AuthControllers.logInUser
);

router.post(
  "/change-password",
  auth(USER_ROLE.user, USER_ROLE.admin),
  validateRequest(authValidations.changePasswordValidationSchema),
  AuthControllers.changePassword
);

router.post(
  "/forget-password",
  validateRequest(authValidations.forgetPasswordValidationSchema),
  AuthControllers.forgetPassword
);

router.post(
  "/reset-password",
  validateRequest(authValidations.resetPasswordValidationSchema),
  AuthControllers.resetPassword
);

router.post(
  "/verify-reset-otp",
  validateRequest(authValidations.verifyResetOtpValidationSchema),
  AuthControllers.verifyResetOtp
);

router.post(
  "/resend-reset-code",
  validateRequest(authValidations.resendResetCodeValidationSchema),
  AuthControllers.resendResetCode
);

// router.post(
//     '/resend-verify-code',
//     validateRequest(authValidations.resendResetCodeValidationSchema),
//     AuthControllers.resendResetCode
// );

router.delete(
  "/delete-user",
  auth(USER_ROLE.user, USER_ROLE.admin),
  AuthControllers.deleteUser
);

export const AuthRoutes = router;
