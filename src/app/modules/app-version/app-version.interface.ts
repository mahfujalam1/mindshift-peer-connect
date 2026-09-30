import {
  APP_PLATFORMS,
  APP_UPDATE_TYPES,
  APP_VERSION_STATUSES,
} from './app-version.constants';

export type TAppPlatform = (typeof APP_PLATFORMS)[number];
export type TAppVersionStatus = (typeof APP_VERSION_STATUSES)[number];
export type TAppUpdateType = (typeof APP_UPDATE_TYPES)[number];

export type TAppVersion = {
  platform: TAppPlatform;
  latestVersion: string;
  minimumVersion: string;
  latestBuildNumber: number;
  minimumBuildNumber: number;
  forceUpdate: boolean;
  updateAvailable: boolean;
  title: string;
  message: string;
  updateButtonText: string;
  laterButtonText?: string | null;
  storeUrl: string;
  releaseNotes?: string;
  status: TAppVersionStatus;
};
