# App Version / Force Update API

> For Dashboard + App Developers · Update popup · Force update

---

## Table of Contents

1. [Overview](#1-overview)
2. [Config Fields](#2-config-fields)
3. [Update Decision Rules](#3-update-decision-rules)
4. [Dashboard APIs (Admin)](#4-dashboard-apis-admin)
5. [App API (Public)](#5-app-api-public)
6. [App Integration Flow](#6-app-integration-flow)
7. [Common Errors](#7-common-errors)

---

## 1. Overview

| Item | Value |
|------|--------|
| Base URL | `{{BASE_URL}}/api/v1` |
| Admin auth | `Authorization: Bearer {{adminAccessToken}}` |
| App check auth | **None** (works before login) |
| Platforms | `android`, `ios` (one config each) |

| # | Method | Endpoint | Who | Purpose |
|---|--------|----------|-----|---------|
| 1 | `GET` | `/app-version` | Admin | Get both platform configs |
| 2 | `PUT` | `/app-version` | Admin | Create / replace configs (one or both platforms) |
| 3 | `GET` | `/app-version/:platform` | Admin | Get one platform config |
| 4 | `PATCH` | `/app-version/:platform` | Admin | Update some fields of one platform |
| 5 | `GET` | `/app-version/check` | App | Should this app show an update popup? |

---

## 2. Config Fields

| Field | Type | Required | Default | Dashboard label |
|-------|------|----------|---------|-----------------|
| `platform` | `"android"` \| `"ios"` | ✅ (PUT) | — | Platform |
| `latestVersion` | string, e.g. `"1.6.0"` | ✅ | — | Latest Version |
| `minimumVersion` | string | ✅ | — | Minimum Version |
| `latestBuildNumber` | integer ≥ 0 | ✅ | — | Build Number (latest) |
| `minimumBuildNumber` | integer ≥ 0 | ✅ | — | Build Number (minimum) |
| `forceUpdate` | boolean | ❌ | `false` | Force Update |
| `updateAvailable` | boolean | ❌ | `true` | Update Available (popup on/off) |
| `title` | string | ❌ | `"Update Available"` | Title |
| `message` | string | ❌ | `"A new version of the app is available..."` | Message |
| `updateButtonText` | string | ❌ | `"Update"` | Update Button |
| `laterButtonText` | string \| null | ❌ | `"Later"` | Later Button |
| `storeUrl` | valid URL | ✅ | — | Store URL |
| `releaseNotes` | string | ❌ | `""` | Release Notes |
| `status` | `"draft"` \| `"published"` \| `"disabled"` | ❌ | `"draft"` | Status |

**Notes**

- Version format: numbers separated by dots, e.g. `1.6`, `1.6.0`, `1.6.0.2`. Compared number by number, so `1.10.0` is newer than `1.9.0`.
- `minimumVersion` + `minimumBuildNumber` cannot be greater than `latestVersion` + `latestBuildNumber` → `400`.
- New configs start as `draft`. **Only `published` configs affect the app.** Send `"status": "published"` when ready.

---

## 3. Update Decision Rules

The app sends its current `version` (and optionally `buildNumber`). The server returns `updateType`:

| Condition (checked top to bottom) | `updateType` | Popup |
|-----------------------------------|--------------|-------|
| No config, `status` is not `published`, or `updateAvailable: false` | `none` | No popup |
| `forceUpdate: true` **and** app is older than minimum | `force` | Update button only |
| App is older than latest | `optional` | Update + Later |
| App is on latest or newer | `none` | No popup |

**`forceUpdate` is the admin's switch.** When it is `false`, nobody is forced. Everyone below latest gets the optional popup, even if they are below minimum. When it is `true`, users below `minimumVersion` are forced; users between minimum and latest still get the optional popup.

To force **everyone** below the latest version, set `minimumVersion` = `latestVersion` (and same build numbers) with `forceUpdate: true`.

**Build number** is only used when the versions are equal. Example: minimum `1.5.0 (105)` → app `1.5.0 (104)` is below minimum; app `1.5.1` (any build) is not. If the app doesn't send `buildNumber`, only the version is compared.

**Example with config** latest `1.6.0 (106)`, minimum `1.5.0 (105)`:

| App version (build) | `forceUpdate: true` | `forceUpdate: false` |
|---------------------|---------------------|----------------------|
| `1.4.9` | `force` | `optional` |
| `1.5.0 (104)` | `force` | `optional` |
| `1.5.0 (105)` | `optional` | `optional` |
| `1.5.3` | `optional` | `optional` |
| `1.6.0 (105)` | `optional` | `optional` |
| `1.6.0 (106)` / `1.6.0` / `1.7.0` | `none` | `none` |

---

## 4. Dashboard APIs (Admin)

### 4.1 Get All Configs

```http
GET {{BASE_URL}}/api/v1/app-version
Authorization: Bearer {{adminAccessToken}}
```

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "App versions retrieved successfully",
  "data": {
    "appVersions": [
      {
        "_id": "66f9...a1",
        "platform": "android",
        "latestVersion": "1.6.0",
        "minimumVersion": "1.5.0",
        "latestBuildNumber": 106,
        "minimumBuildNumber": 105,
        "forceUpdate": false,
        "updateAvailable": true,
        "title": "Update Available",
        "message": "A new version of the app is available. Please update to get the latest features.",
        "updateButtonText": "Update",
        "laterButtonText": "Later",
        "storeUrl": "https://play.google.com/store/apps/details?id=com.example.app",
        "releaseNotes": "Bug fixes and performance improvements",
        "status": "published",
        "createdAt": "2026-09-30T04:00:00.000Z",
        "updatedAt": "2026-09-30T04:00:00.000Z"
      },
      {
        "_id": "66f9...a2",
        "platform": "ios",
        "...": "same shape"
      }
    ]
  }
}
```

Empty `appVersions: []` means nothing is configured yet. Show the create form.

---

### 4.2 Create / Replace Configs (Save Button)

Creates the platform config if it doesn't exist, otherwise overwrites the sent fields. Send one or both platforms.

```http
PUT {{BASE_URL}}/api/v1/app-version
Authorization: Bearer {{adminAccessToken}}
Content-Type: application/json
```

**Body**

```json
{
  "appVersions": [
    {
      "platform": "android",
      "latestVersion": "1.6.0",
      "minimumVersion": "1.5.0",
      "latestBuildNumber": 106,
      "minimumBuildNumber": 105,
      "forceUpdate": false,
      "updateAvailable": true,
      "title": "New update available",
      "message": "Update now to get the latest features.",
      "updateButtonText": "Update now",
      "laterButtonText": "Later",
      "storeUrl": "https://play.google.com/store/apps/details?id=com.example.app",
      "releaseNotes": "• Chat message delete\n• Bug fixes",
      "status": "published"
    },
    {
      "platform": "ios",
      "latestVersion": "1.6.0",
      "minimumVersion": "1.5.0",
      "latestBuildNumber": 106,
      "minimumBuildNumber": 105,
      "forceUpdate": false,
      "status": "published",
      "storeUrl": "https://apps.apple.com/app/example"
    }
  ]
}
```

**Response `200`**: same shape as [4.1](#41-get-all-configs).

**Rules**

- Each item needs `platform`, `latestVersion`, `minimumVersion`, `latestBuildNumber`, `minimumBuildNumber`, `storeUrl`
- The same platform cannot appear twice
- `_id`, `__v`, `createdAt`, `updatedAt` are accepted and ignored (you can send back the `GET` objects as they are)
- Any other unknown field → `400`

---

### 4.3 Get One Platform

```http
GET {{BASE_URL}}/api/v1/app-version/android
Authorization: Bearer {{adminAccessToken}}
```

**Response `200`**: `data` is a single config object. `404` if not created yet.

---

### 4.4 Update Some Fields (Toggles / Quick Edit)

Only send what changed. The platform config must already exist (create it with `PUT` first).

```http
PATCH {{BASE_URL}}/api/v1/app-version/ios
Authorization: Bearer {{adminAccessToken}}
Content-Type: application/json
```

**Body examples**

```json
{ "forceUpdate": true }
```

```json
{ "status": "disabled" }
```

```json
{ "laterButtonText": null }
```

```json
{
  "latestVersion": "1.7.0",
  "latestBuildNumber": 110,
  "releaseNotes": "• New feature"
}
```

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "App version updated successfully",
  "data": {
    "platform": "ios",
    "latestVersion": "1.7.0",
    "latestBuildNumber": 110,
    "forceUpdate": false,
    "status": "published",
    "...": "full updated config"
  }
}
```

---

## 5. App API (Public)

### 5.1 Check For Update

Call on app start (splash screen) and when the app returns from background. No token needed.

```http
GET {{BASE_URL}}/api/v1/app-version/check?platform=android&version=1.5.3&buildNumber=105
```

| Query | Required | Example |
|-------|----------|---------|
| `platform` | ✅ | `android` / `ios` |
| `version` | ✅ | `1.5.3` |
| `buildNumber` | ❌ (recommended) | `105` |

**Response `200`: optional update**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "App version checked successfully",
  "data": {
    "platform": "android",
    "currentVersion": "1.5.3",
    "currentBuildNumber": 105,
    "updateType": "optional",
    "updateAvailable": true,
    "forceUpdate": false,
    "latestVersion": "1.6.0",
    "latestBuildNumber": 106,
    "minimumVersion": "1.5.0",
    "minimumBuildNumber": 105,
    "popup": {
      "title": "New update available",
      "message": "Update now to get the latest features.",
      "updateButtonText": "Update now",
      "laterButtonText": "Later",
      "storeUrl": "https://play.google.com/store/apps/details?id=com.example.app",
      "releaseNotes": "• Chat message delete\n• Bug fixes"
    }
  }
}
```

**Force update**: `updateType: "force"`, `forceUpdate: true`, and `popup.laterButtonText` is always `null`.

**No update**

```json
{
  "data": {
    "platform": "android",
    "currentVersion": "1.6.0",
    "currentBuildNumber": 106,
    "updateType": "none",
    "updateAvailable": false,
    "forceUpdate": false,
    "latestVersion": "1.6.0",
    "latestBuildNumber": 106,
    "minimumVersion": "1.5.0",
    "minimumBuildNumber": 105,
    "popup": null
  }
}
```

When no config is published, `latestVersion`, `minimumVersion` and the build numbers are `null`, and `updateType` is `"none"`.

---

## 6. App Integration Flow

```js
const res = await fetch(
  `${BASE_URL}/api/v1/app-version/check?platform=${Platform.OS}&version=${appVersion}&buildNumber=${buildNumber}`
);
const { data } = await res.json();

switch (data.updateType) {
  case "force":
    // Blocking dialog: no Later button, can't dismiss (disable back button)
    // Update button → open data.popup.storeUrl
    break;
  case "optional":
    // Dismissible dialog with Update + data.popup.laterButtonText (if not null)
    // Optional: remember "Later" for this latestVersion so you don't show it every launch
    break;
  case "none":
    // Continue normally
    break;
}
```

**Tips**

- If the check request fails (no internet or server down), let the user continue. Don't block the app.
- Re-check when the app comes back from background, so a force update published while the app was open still applies.
- Show `releaseNotes` as plain text (`\n` = new line).

---

## 7. Common Errors

| Status | When |
|--------|------|
| `400` | Invalid version format, invalid `storeUrl`, unknown field, duplicate platform, minimum greater than latest, missing `platform`/`version` on check |
| `401` / `403` | Admin APIs called without an admin token |
| `404` | `GET`/`PATCH /app-version/:platform` before the platform is created |
