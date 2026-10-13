import { string, z } from "zod";

const emailSchema = z.string({ required_error: 'Email is required' }).trim().toLowerCase();

const loginValidation = z.object({
  body: z.object({
    email: emailSchema,
    password: string(),
    // Opaque OneSignal subscription id; see user-validation.ts.
    playerId: z.string().trim().min(1).optional(),
  }),
});

const forgetPasswordValidationSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z.string({ required_error: 'Old password is required' }),
    newPassword: z.string({ required_error: 'Password is required' }),
    confirmNewPassword: z.string({
      required_error: 'Confirm password is required',
    }),
  }),
});


const verifyResetOtpValidationSchema = z.object({
  body: z.object({
    email: emailSchema,
    resetCode: z.number({
      required_error: 'Reset code is required',
      invalid_type_error: 'Reset code must be number',
    }),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string({ required_error: 'Password is required' }),
    confirmPassword: z.string({
      required_error: 'Confirm password is required',
    }),
  }),
});



const resendResetCodeValidationSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

const deleteUserValidationSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required').optional(),
  }),
});


export const authValidations = {
  loginValidation,
  forgetPasswordValidationSchema,
  resendResetCodeValidationSchema,
  resetPasswordValidationSchema,
  verifyResetOtpValidationSchema,
  changePasswordValidationSchema,
  deleteUserValidationSchema,
};
