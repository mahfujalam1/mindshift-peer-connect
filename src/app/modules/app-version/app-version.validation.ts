import { z } from 'zod';
import {
  APP_PLATFORMS,
  APP_VERSION_STATUSES,
  VERSION_REGEX,
} from './app-version.constants';

const versionString = z
  .string()
  .trim()
  .regex(VERSION_REGEX, { message: 'Version must look like 1.6.0' });

const buildNumber = z.number().int().min(0);

const optionalText = z.string().trim().min(1).optional();

const appVersionFields = {
  latestVersion: versionString,
  minimumVersion: versionString,
  latestBuildNumber: buildNumber,
  minimumBuildNumber: buildNumber,
  forceUpdate: z.boolean().optional(),
  updateAvailable: z.boolean().optional(),
  title: optionalText,
  message: optionalText,
  updateButtonText: optionalText,
  laterButtonText: z.string().trim().nullable().optional(),
  storeUrl: z.string().trim().url({ message: 'storeUrl must be a valid URL' }),
  releaseNotes: z.string().trim().optional(),
  status: z.enum(APP_VERSION_STATUSES).optional(),
};

// Dashboard may send back the object it got from GET; these keys are ignored.
const documentMetaFields = {
  _id: z.unknown().optional(),
  __v: z.unknown().optional(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
};

const appVersionItemSchema = z
  .object({
    platform: z.enum(APP_PLATFORMS),
    ...appVersionFields,
    ...documentMetaFields,
  })
  .strict();

const upsertAppVersionsValidationSchema = z.object({
  body: z
    .object({
      appVersions: z
        .array(appVersionItemSchema)
        .min(1, { message: 'At least one platform config is required' })
        .refine(
          (items) => new Set(items.map((item) => item.platform)).size === items.length,
          { message: 'Each platform can appear only once' }
        ),
    })
    .strict(),
});

const updateAppVersionValidationSchema = z.object({
  params: z.object({
    platform: z.enum(APP_PLATFORMS),
  }),
  body: z
    .object({
      latestVersion: versionString.optional(),
      minimumVersion: versionString.optional(),
      latestBuildNumber: buildNumber.optional(),
      minimumBuildNumber: buildNumber.optional(),
      forceUpdate: appVersionFields.forceUpdate,
      updateAvailable: appVersionFields.updateAvailable,
      title: appVersionFields.title,
      message: appVersionFields.message,
      updateButtonText: appVersionFields.updateButtonText,
      laterButtonText: appVersionFields.laterButtonText,
      storeUrl: appVersionFields.storeUrl.optional(),
      releaseNotes: appVersionFields.releaseNotes,
      status: appVersionFields.status,
      platform: z.enum(APP_PLATFORMS).optional(),
      ...documentMetaFields,
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
});

const platformParamValidationSchema = z.object({
  params: z.object({
    platform: z.enum(APP_PLATFORMS),
  }),
});

const checkAppVersionValidationSchema = z.object({
  query: z.object({
    platform: z.enum(APP_PLATFORMS, {
      required_error: 'platform is required (android | ios)',
    }),
    version: versionString,
    buildNumber: z
      .string()
      .regex(/^\d+$/, { message: 'buildNumber must be a whole number' })
      .optional(),
  }),
});

export const AppVersionValidations = {
  upsertAppVersionsValidationSchema,
  updateAppVersionValidationSchema,
  platformParamValidationSchema,
  checkAppVersionValidationSchema,
};
