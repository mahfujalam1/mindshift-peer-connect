import httpStatus from 'http-status';
import AppError from '../../error/appError';
import AppVersion from './app-version.model';
import {
  TAppPlatform,
  TAppUpdateType,
  TAppVersion,
} from './app-version.interface';
import { APP_PLATFORMS } from './app-version.constants';

type TVersionPoint = { version: string; buildNumber?: number };

const CONFIG_FIELDS = [
  'latestVersion',
  'minimumVersion',
  'latestBuildNumber',
  'minimumBuildNumber',
  'forceUpdate',
  'updateAvailable',
  'title',
  'message',
  'updateButtonText',
  'laterButtonText',
  'storeUrl',
  'releaseNotes',
  'status',
] as const;

const pickConfigFields = (payload: Record<string, unknown>) => {
  const config: Record<string, unknown> = {};
  for (const field of CONFIG_FIELDS) {
    if (payload[field] !== undefined) {
      config[field] = payload[field];
    }
  }
  return config as Partial<TAppVersion>;
};

const compareVersions = (a: string, b: string) => {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  const length = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < length; i++) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff !== 0) {
      return diff > 0 ? 1 : -1;
    }
  }

  return 0;
};

/**
 * Build numbers only break ties when both sides have the same version.
 */
const isOlderThan = (current: TVersionPoint, target: TVersionPoint) => {
  const versionDiff = compareVersions(current.version, target.version);
  if (versionDiff !== 0) {
    return versionDiff < 0;
  }

  if (current.buildNumber === undefined || target.buildNumber === undefined) {
    return false;
  }

  return current.buildNumber < target.buildNumber;
};

const assertVersionRange = (config: Partial<TAppVersion>) => {
  const { latestVersion, minimumVersion, latestBuildNumber, minimumBuildNumber } = config;
  if (!latestVersion || !minimumVersion) {
    return;
  }

  const isMinimumAboveLatest = isOlderThan(
    { version: latestVersion, buildNumber: latestBuildNumber },
    { version: minimumVersion, buildNumber: minimumBuildNumber }
  );

  if (isMinimumAboveLatest) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `${config.platform}: minimumVersion/build cannot be greater than latestVersion/build`
    );
  }
};

const sortByPlatform = <T extends { platform: TAppPlatform }>(items: T[]) =>
  [...items].sort(
    (a, b) => APP_PLATFORMS.indexOf(a.platform) - APP_PLATFORMS.indexOf(b.platform)
  );

const getAppVersions = async () => {
  const appVersions = await AppVersion.find({}).lean();
  return { appVersions: sortByPlatform(appVersions) };
};

const getAppVersionByPlatform = async (platform: TAppPlatform) => {
  const appVersion = await AppVersion.findOne({ platform }).lean();
  if (!appVersion) {
    throw new AppError(httpStatus.NOT_FOUND, `No app version config found for ${platform}`);
  }

  return appVersion;
};

const upsertAppVersions = async (appVersions: TAppVersion[]) => {
  appVersions.forEach(assertVersionRange);

  await Promise.all(
    appVersions.map((item) =>
      AppVersion.findOneAndUpdate(
        { platform: item.platform },
        { $set: pickConfigFields(item) },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      )
    )
  );

  return getAppVersions();
};

const updateAppVersion = async (
  platform: TAppPlatform,
  body: Record<string, unknown>
) => {
  const payload = pickConfigFields(body);
  if (!Object.keys(payload).length) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Provide at least one field to update');
  }

  if (body.platform && body.platform !== platform) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Body platform (${body.platform}) does not match URL platform (${platform})`
    );
  }

  const existing = await AppVersion.findOne({ platform }).lean();
  if (!existing) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `No app version config found for ${platform}. Create it with PUT /app-version first`
    );
  }

  assertVersionRange({ ...existing, ...payload, platform });

  return AppVersion.findOneAndUpdate(
    { platform },
    { $set: payload },
    { new: true, runValidators: true }
  ).lean();
};

const checkAppVersion = async (query: {
  platform: TAppPlatform;
  version: string;
  buildNumber?: string;
}) => {
  const current: TVersionPoint = {
    version: query.version.trim(),
    buildNumber:
      query.buildNumber !== undefined ? Number(query.buildNumber) : undefined,
  };

  const config = await AppVersion.findOne({
    platform: query.platform,
    status: 'published',
  }).lean();

  let updateType: TAppUpdateType = 'none';

  if (config && config.updateAvailable) {
    const belowMinimum = isOlderThan(current, {
      version: config.minimumVersion,
      buildNumber: config.minimumBuildNumber,
    });
    const belowLatest = isOlderThan(current, {
      version: config.latestVersion,
      buildNumber: config.latestBuildNumber,
    });

    // Admin's forceUpdate switch decides whether the minimum version is enforced.
    if (config.forceUpdate && belowMinimum) {
      updateType = 'force';
    } else if (belowLatest) {
      updateType = 'optional';
    }
  }

  return {
    platform: query.platform,
    currentVersion: current.version,
    currentBuildNumber: current.buildNumber ?? null,
    updateType,
    updateAvailable: updateType !== 'none',
    forceUpdate: updateType === 'force',
    latestVersion: config?.latestVersion ?? null,
    latestBuildNumber: config?.latestBuildNumber ?? null,
    minimumVersion: config?.minimumVersion ?? null,
    minimumBuildNumber: config?.minimumBuildNumber ?? null,
    popup:
      config && updateType !== 'none'
        ? {
          title: config.title,
          message: config.message,
          updateButtonText: config.updateButtonText,
          laterButtonText:
            updateType === 'force' ? null : config.laterButtonText || null,
          storeUrl: config.storeUrl,
          releaseNotes: config.releaseNotes || '',
        }
        : null,
  };
};

export const AppVersionServices = {
  getAppVersions,
  getAppVersionByPlatform,
  upsertAppVersions,
  updateAppVersion,
  checkAppVersion,
};
