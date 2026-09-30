import { model, Schema } from 'mongoose';
import { TAppVersion } from './app-version.interface';
import {
  APP_PLATFORMS,
  APP_VERSION_DEFAULTS,
  APP_VERSION_STATUSES,
} from './app-version.constants';

const appVersionSchema = new Schema<TAppVersion>(
  {
    platform: {
      type: String,
      enum: APP_PLATFORMS,
      required: true,
      unique: true,
    },
    latestVersion: { type: String, required: true, trim: true },
    minimumVersion: { type: String, required: true, trim: true },
    latestBuildNumber: { type: Number, required: true, min: 0 },
    minimumBuildNumber: { type: Number, required: true, min: 0 },
    forceUpdate: { type: Boolean, default: false },
    updateAvailable: { type: Boolean, default: true },
    title: { type: String, trim: true, default: APP_VERSION_DEFAULTS.title },
    message: { type: String, trim: true, default: APP_VERSION_DEFAULTS.message },
    updateButtonText: {
      type: String,
      trim: true,
      default: APP_VERSION_DEFAULTS.updateButtonText,
    },
    laterButtonText: {
      type: String,
      trim: true,
      default: APP_VERSION_DEFAULTS.laterButtonText,
    },
    storeUrl: { type: String, required: true, trim: true },
    releaseNotes: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: APP_VERSION_STATUSES,
      default: 'draft',
    },
  },
  { timestamps: true }
);

const AppVersion = model<TAppVersion>('AppVersion', appVersionSchema);

export default AppVersion;
