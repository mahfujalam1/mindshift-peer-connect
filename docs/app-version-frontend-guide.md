# App Update Popup: Frontend Integration Guide

Base URL: `{{BASE_URL}}/api/v1`

There are two parts:

- **Part A: Mobile App** (Android / iOS): check for updates and show the popup
- **Part B: Admin Dashboard**: the form where admin sets versions and popup text

---

## Part A: Mobile App

### A1. What to do

1. On app start (splash screen), call the check API. **No token needed**, so call it before login.
2. Call it again whenever the app comes back from background.
3. Show a popup based on `data.updateType`.

### A2. API

```http
GET /app-version/check?platform=android&version=1.5.3&buildNumber=105
```

| Query | Required | Value |
|-------|----------|-------|
| `platform` | Yes | `android` or `ios` |
| `version` | Yes | App version name, e.g. `1.5.3` |
| `buildNumber` | Recommended | Build number / version code, e.g. `105` |

### A3. Response

```json
{
  "success": true,
  "data": {
    "updateType": "optional",
    "latestVersion": "1.6.0",
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

Only `updateType` and `popup` are needed for the UI.

### A4. What to show

| `updateType` | Show | Buttons | Can close? |
|--------------|------|---------|------------|
| `"force"` | Blocking popup | Update only (`laterButtonText` is `null`) | **No.** Disable back button / outside tap |
| `"optional"` | Normal popup | Update + Later | Yes |
| `"none"` | Nothing (`popup` is `null`) | — | — |

- **Update button** → open `popup.storeUrl`
- **Later button** → close popup. Hide this button if `laterButtonText` is `null`.
- Show `popup.title`, `popup.message`, `popup.releaseNotes` as text (`\n` = new line). Don't hardcode these texts; admin changes them from the dashboard.

### A5. Example (React Native)

```js
import { Platform, Linking } from "react-native";
import DeviceInfo from "react-native-device-info";

export async function checkAppUpdate() {
  try {
    const params = new URLSearchParams({
      platform: Platform.OS,                    // "android" | "ios"
      version: DeviceInfo.getVersion(),         // "1.5.3"
      buildNumber: DeviceInfo.getBuildNumber(), // "105"
    });

    const res = await fetch(`${BASE_URL}/api/v1/app-version/check?${params}`);
    const { data } = await res.json();

    if (data.updateType === "force") {
      showBlockingUpdateDialog(data.popup);   // no Later, can't dismiss
    } else if (data.updateType === "optional") {
      showUpdateDialog(data.popup);           // Update + Later
    }
  } catch {
    // Network / server error → let the user continue, never block the app
  }
}

// Update button handler
const openStore = (popup) => Linking.openURL(popup.storeUrl);
```

Flutter: use `package_info_plus` → `version` and `buildNumber`, same logic.

### A6. Checklist

- [ ] Call check on app start and on resume from background
- [ ] Send `platform`, `version`, `buildNumber`
- [ ] `force` → popup cannot be closed, no Later button
- [ ] `optional` → Update + Later
- [ ] Update opens `storeUrl`
- [ ] If the API fails → continue normally
- [ ] (Optional) After "Later", don't show the optional popup again for the same `latestVersion` in this session

---

## Part B: Admin Dashboard

All requests need `Authorization: Bearer {{adminAccessToken}}`.

### B1. Page load: get current settings

```http
GET /app-version
```

```json
{
  "success": true,
  "data": {
    "appVersions": [
      {
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
        "releaseNotes": "",
        "status": "published"
      },
      { "platform": "ios", "...": "same fields" }
    ]
  }
}
```

- `appVersions: []` → nothing saved yet, so show an empty form.
- Show one form (or tab) per platform: **Android** and **iOS**.

### B2. Form fields

| Label | Field | Input | Required |
|-------|-------|-------|----------|
| Latest Version | `latestVersion` | Text, e.g. `1.6.0` | Yes |
| Latest Build Number | `latestBuildNumber` | Number | Yes |
| Minimum Version | `minimumVersion` | Text, e.g. `1.5.0` | Yes |
| Minimum Build Number | `minimumBuildNumber` | Number | Yes |
| Store URL | `storeUrl` | URL | Yes |
| Force Update | `forceUpdate` | Switch | No (default off) |
| Update Available | `updateAvailable` | Switch (popup on/off) | No (default on) |
| Title | `title` | Text | No |
| Message | `message` | Textarea | No |
| Update Button | `updateButtonText` | Text | No |
| Later Button | `laterButtonText` | Text (empty → send `null` to hide) | No |
| Release Notes | `releaseNotes` | Textarea | No |
| Status | `status` | Select: `draft` / `published` / `disabled` | No (default `draft`) |

**Important:** only **Published** takes effect in the app. Draft and Disabled mean no popup.

**How Force Update works** (show this as a hint under the switch)

- **Off:** nobody is forced. Users below Latest Version see the popup with the Later button.
- **On:** users below Minimum Version see the popup without the Later button (must update). Users between Minimum and Latest still see the Later button.
- To force everyone to the latest version: turn it On and set Minimum Version = Latest Version.

**Validation to do in the form**

- Version: numbers with dots only (`1.6.0`)
- Build numbers: whole numbers, 0 or more
- Minimum version must not be greater than latest version (the server also returns `400`)

### B3. Save button: create or update full form

```http
PUT /app-version
Content-Type: application/json
```

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
    }
  ]
}
```

- Send one platform or both in the array.
- You can send back the objects you got from `GET` as they are. `_id`, `__v`, `createdAt` and `updatedAt` are ignored. Any other unknown field returns `400`.
- Response returns the updated `appVersions` list, so refresh the form with it.

### B4. Quick toggle: change one field

For switches (Force Update, Update Available, Status) without saving the whole form:

```http
PATCH /app-version/android
Content-Type: application/json
```

```json
{ "forceUpdate": true }
```

Works only after the platform was saved once with `PUT`.

### B5. Error display

Errors come as:

```json
{
  "success": false,
  "message": "appVersions.0.storeUrl: storeUrl must be a valid URL",
  "errorMessages": [
    { "path": "body.appVersions.0.storeUrl", "message": "storeUrl must be a valid URL" }
  ]
}
```

Show `message` as a toast. It already contains the exact reason. Use `errorMessages[].path` if you want to highlight the specific input.

### B6. Checklist

- [ ] Load with `GET /app-version`
- [ ] Android and iOS forms
- [ ] Save with `PUT /app-version`
- [ ] Switches can use `PATCH /app-version/:platform`
- [ ] Remind admin: set Status to **Published** to go live
