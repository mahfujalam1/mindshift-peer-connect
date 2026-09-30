export const APP_PLATFORMS = ['android', 'ios'] as const;

export const APP_VERSION_STATUSES = ['draft', 'published', 'disabled'] as const;

export const APP_UPDATE_TYPES = ['force', 'optional', 'none'] as const;

export const VERSION_REGEX = /^\d+(\.\d+){0,3}$/;

export const APP_VERSION_DEFAULTS = {
  title: 'Update Available',
  message: 'A new version of the app is available. Please update to get the latest features.',
  updateButtonText: 'Update',
  laterButtonText: 'Later',
};
