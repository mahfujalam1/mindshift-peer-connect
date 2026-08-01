import { z } from "zod";
import { ENUM_USER_STATUS } from "../../utilities/enum";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, {
  message: 'Invalid ObjectId',
});

// Define the schema
const UserValidationSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, { message: 'full Name is required' }).max(12, { message: "Full Name is maximum within 12 character" }),
    email: z.string().email({ message: 'Invalid email format' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
    profession: z.string({ required_error: 'Profession ID is required' }),
    licenseNo: z.string({ required_error: 'License Number is required' }),
    governingBody: z.string({ required_error: 'Governing Body ID is required' }),
    country: z.string({ required_error: 'Country is required' }),
    city: z.string({ required_error: 'City is required' }),
    playerId: z.string().uuid().optional(),
  }),
});


const updateProfileValidationSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    profession: objectIdSchema.optional(),
    licenseNo: z.string().min(1).optional(),
    governingBody: objectIdSchema.optional(),
    phone: z.string().optional(),
    bio: z.string().optional(),
    country: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    location: z.object({
      address: z.string().optional(),
      coordinates: z.tuple([z.number(), z.number()]).optional(),
      radiusInKm: z.number().nonnegative().optional(),
    }).strict().optional(),
  }).strict(),
});


const loginValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
    password: z.string({ required_error: 'Password is required' }),
    playerId: z.string().uuid().optional(),
  }),
});


const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z.string({ required_error: 'Old password is required' }),
    newPassword: z.string({ required_error: 'Password is required' }),
  }),
});


// refresh token validation schema -----------
const refreshTokenValidationSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({ required_error: 'Refresh token is required' }),
  }),
});



// forget password validation schema
const forgetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'User email is required' }),
  }),
});


// reset password validation schema
const resetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'User email is required' }),
    newPassword: z.string({ required_error: 'New password is required' }),
  }),
});



const verifyCodeValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
    verifyCode: z.number({ required_error: 'Phone number is required' }),
  }),
});

const resendVerifyCodeSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
  }),
});

const changeUserStatus = z.object({
  body: z.object({
    status: z.enum(
      Object.values(ENUM_USER_STATUS) as [string, ...string[]]
    ),
  }),
});

const deleteUserAccountValidationSchema = z.object({
  body: z.object({
    password: z.string({ required_error: 'Password is required' }),
  }),
});

const userValidations = {
  UserValidationSchema,
  loginValidationSchema,
  changePasswordValidationSchema,
  refreshTokenValidationSchema,
  forgetPasswordValidationSchema,
  resetPasswordValidationSchema,
  verifyCodeValidationSchema,
  resendVerifyCodeSchema,
  changeUserStatus,
  deleteUserAccountValidationSchema,
  updateProfileValidationSchema
};

export default userValidations;
