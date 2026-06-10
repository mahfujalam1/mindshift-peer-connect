import { string, z } from "zod";

const loginValidation = z.object({
  body: z.object({
    email: string(),
    password: string(),
  }),
});

const forgetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
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
    email: z.string({ required_error: 'Email is required' }),
    resetCode: z.number({
      required_error: 'Reset code is required',
      invalid_type_error: 'Reset code must be number',
    }),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
    password: z.string({ required_error: 'Password is required' }),
    confirmPassword: z.string({
      required_error: 'Confirm password is required',
    }),
  }),
});



const resendResetCodeValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
  }),
});


export const authValidations = {
  loginValidation,
  forgetPasswordValidationSchema,
  resendResetCodeValidationSchema,
  resetPasswordValidationSchema,
  verifyResetOtpValidationSchema,
  changePasswordValidationSchema
};