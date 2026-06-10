import mongoose, { Schema, Document } from 'mongoose';
import { TUser, UserModel } from './user-interface';
import bcrypt from 'bcrypt';
import config from '../../config';

const userSchema: Schema = new Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    profession: { type: String, required: true },
    licenseNo: { type: String, required: true },
    governingBody: { type: String, required: true },
    phone: { type: String, default: null },
    bio: { type: String, default: null },
    country: { type: String, required: true },
    city: { type: String, required: true },
    location: {
      address: { type: String, default: null },
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      radiusInKm: { type: Number, default: null },
    },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    profileImage: { type: String, default: null },
    password: { type: String, required: true },
    isPremium: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    verifyCode: { type: Number, },
    resetCode: { type: Number },
    isVerified: { type: Boolean, default: false },
    passwordChangedAt: {
      type: Date,
    },
    isResetVerified: { type: Boolean, default: false },
    codeExpireIn: { type: Date, default: null },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    playerIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Create a 2dsphere index to enable fast geospatial queries (e.g. finding nearby content)
userSchema.index({ 'location.coordinates': '2dsphere' });


userSchema.pre('save', async function (next) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const user = this;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) {
    return next();
  }

  if (user.password) {
    user.password = await bcrypt.hash(
      user.password as string,
      Number(config.bcrypt_salt_rounds)
    );
  }
  next();
});

// Remove the password from the response after saving
userSchema.post('save', function (doc, next) {
  doc.password = '';
  next();
});

// Static method for checking if the password matches
userSchema.statics.isPasswordMatched = async function (
  plainPassword: string,
  hashPassword: string
) {
  return await bcrypt.compare(plainPassword, hashPassword);
};

// Static method for checking if JWT was issued before password change
userSchema.statics.isJWTIssuedBeforePasswordChange = async function (
  passwordChangeTimeStamp,
  jwtIssuedTimeStamp
) {
  const passwordChangeTime = new Date(passwordChangeTimeStamp).getTime() / 1000;
  return passwordChangeTime > jwtIssuedTimeStamp;
};

// Creating the User model using the user schema and custom model interface
const User = mongoose.model<TUser & Document, UserModel>('User', userSchema);

export default User;
