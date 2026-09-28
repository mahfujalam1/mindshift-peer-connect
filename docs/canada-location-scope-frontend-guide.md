# Canada Location Scope — Frontend Integration Guide

> Province/Territory support + 3 location levels for the Consult feed.  
> Base URL: `{{BASE_URL}}/api/v1` · Auth: `Authorization: Bearer {{accessToken}}`

---

## Table of Contents

1. [What Changed](#1-what-changed)
2. [Province / Territory List](#2-province--territory-list)
3. [Signup — send `province`](#3-signup--send-province)
4. [Update Profile — edit `province`](#4-update-profile--edit-province)
5. [Get My Profile — read `province`](#5-get-my-profile--read-province)
6. [Create Consultation — nothing new to send](#6-create-consultation--nothing-new-to-send)
7. [Consult Feed — `scope` + `radiusInKm`](#7-consult-feed--scope--radiusinkm)
8. [UI Flow](#8-ui-flow)
9. [Errors](#9-errors)
10. [Frontend Checklist](#10-frontend-checklist)

---

## 1. What Changed

Location hierarchy:

```
Canada → Province/Territory → City → Radius
```

The consult feed now has **3 levels**:

| Level | `scope` value | Shows | Backend filter |
|-------|---------------|-------|----------------|
| Canada-wide | `canada` | Posts from anywhere in the user's country | Same `country` |
| **Provincewide (DEFAULT)** | `province` | Posts from the user's whole province | Same `province` + `country` (**not** a radius) |
| City / Local | `city` | Posts within a distance of the user | User coordinates + `radiusInKm` |

- Default is now **Provincewide**, not City.
- Radius is used **only** for `scope=city`.
- `province` is a plain **string** on the user profile.

---

## 2. Province / Territory List

Use a **dropdown** with these exact values. Matching is case-insensitive, but spelling must match, so avoid free-text input.

```js
export const CANADA_PROVINCES = [
  "Ontario",
  "Quebec",
  "British Columbia",
  "Alberta",
  "Manitoba",
  "Saskatchewan",
  "Nova Scotia",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Prince Edward Island",
  "Yukon",
  "Northwest Territories",
  "Nunavut",
];
```

---

## 3. Signup — send `province`

`province` is now **required** at signup.

```http
POST {{BASE_URL}}/api/v1/user/signup
Content-Type: application/json
```

```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "profession": "66f1profession00000000001",
  "licenseNo": "LIC-12345",
  "governingBody": "66f1governing000000000001",
  "country": "Canada",
  "province": "Ontario",
  "city": "Ottawa",
  "playerId": "optional-onesignal-id"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `country` | string | yes | `"Canada"` |
| `province` | string | **yes (new)** | Value from the list above |
| `city` | string | yes | e.g. `"Ottawa"` |

Missing `province` returns a `400` validation error: `Province is required`.

---

## 4. Update Profile — edit `province`

Existing users don't have a province yet. They **must** set it before they can create a consultation, and before they can see the Provincewide feed.

```http
PATCH {{BASE_URL}}/api/v1/user/update-profile
Content-Type: multipart/form-data
```

Send the profile fields as a JSON string in `data` (same as today):

| Key | Type | Example |
|-----|------|---------|
| `data` | Text | `{"province":"Ontario","city":"Ottawa"}` |
| `file` | File | optional profile image |

Location for the City/Local feed (unchanged):

```json
{
  "province": "Ontario",
  "city": "Ottawa",
  "location": {
    "address": "Ottawa, ON",
    "coordinates": [-75.6972, 45.4215],
    "radiusInKm": 50
  }
}
```

> `coordinates` are `[longitude, latitude]`.

---

## 5. Get My Profile — read `province`

```http
GET {{BASE_URL}}/api/v1/user/get-my-profile
```

```json
{
  "data": {
    "_id": "...",
    "fullName": "Jane Doe",
    "country": "Canada",
    "province": "Ontario",
    "city": "Ottawa",
    "location": {
      "coordinates": [-75.6972, 45.4215],
      "radiusInKm": 50
    }
  }
}
```

If `province` is `null`, show a prompt asking the user to complete their profile.

---

## 6. Create Consultation — nothing new to send

The request body is **unchanged**. The backend copies `city`, `province` and `country` from the author's profile.

```http
POST {{BASE_URL}}/api/v1/consult/create
```

```json
{
  "issue": "Anxiety support",
  "supportNeeded": "Looking for a colleague to consult with",
  "urgency": "Normal"
}
```

If the user's profile has no province, the request fails with:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Please update your province in profile before creating a consultation"
}
```

→ Send the user to Edit Profile.

---

## 7. Consult Feed — `scope` + `radiusInKm`

```http
GET {{BASE_URL}}/api/v1/consult/all?scope=province&page=1&limit=10
```

**Query params**

| Param | Required | Values | Default | Notes |
|-------|----------|--------|---------|-------|
| `scope` | no | `canada` \| `province` \| `city` | `province` | Location level |
| `radiusInKm` | no | `1` `5` `10` `25` `50` `100` `250` `500` | user's saved `location.radiusInKm` | Used only when `scope=city` |
| `isMyPosts` | no | `true` \| `false` | `false` | `true` = my posts only (ignores scope) |
| `search` | no | string | — | Searches issue / supportNeeded |
| `status` | no | `Open` \| `Active Now` \| `Closed` | — | |
| `urgency` | no | `Normal` \| `Urgent` | — | |
| `page` / `limit` | no | number | `1` / `10` | |
| `sort` | no | e.g. `-createdAt` | `-createdAt` | |

**Examples**

```http
# Default — whole province
GET /api/v1/consult/all

# Whole Canada
GET /api/v1/consult/all?scope=canada

# Ottawa + 50 km
GET /api/v1/consult/all?scope=city&radiusInKm=50

# My own posts
GET /api/v1/consult/all?isMyPosts=true
```

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Consult posts retrieved successfully",
  "data": {
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 24,
      "totalPage": 3,
      "scope": "province"
    },
    "result": [
      {
        "_id": "...",
        "issue": "Anxiety support",
        "supportNeeded": "...",
        "urgency": "Normal",
        "status": "Open",
        "city": "Toronto",
        "province": "Ontario",
        "country": "Canada",
        "author": {
          "_id": "...",
          "fullName": "Anonymous User",
          "profileImage": null,
          "profession": "..."
        },
        "isMyPost": false,
        "createdAt": "..."
      }
    ]
  }
}
```

`meta.scope` tells you which level was actually applied.

**How each scope behaves**

| `scope` | Behaviour | Empty list when |
|---------|-----------|-----------------|
| `canada` | Other users' posts in the same country | User has no `country` |
| `province` | Other users' posts in the same province + country | User has no `province` |
| `city` | Posts within `radiusInKm` of the user's coordinates. If the user has no coordinates or radius, falls back to posts in the same city + country | User has no coordinates **and** no city |

Your own posts never appear in the feed. Use `isMyPosts=true` to see them.

---

## 8. UI Flow

```
┌──────────────────────────────────────────┐
│  Location:  [ Canada ] [●Province] [ City ]│   ← default = Province
└──────────────────────────────────────────┘
          │ City selected
          ▼
   Radius:  1 · 5 · 10 · 25 · [50] · 100 · 250 · 500 km
```

1. On feed open, call `GET /consult/all` (no `scope`, so Provincewide).
2. Show the label from the profile, e.g. **"Ontario – Provincewide"**.
3. Tap **Canada**: `GET /consult/all?scope=canada`.
4. Tap **City**: show the radius selector, then call `GET /consult/all?scope=city&radiusInKm=<value>`.
5. Pre-select the radius from `profile.location.radiusInKm` if it's one of the allowed values. Otherwise pre-select `50`.
6. City/Local needs coordinates for real radius search. If `profile.location.coordinates` is missing or `[0, 0]`, ask for location permission and save it with Update Profile.
7. Reset `page` to `1` whenever `scope` or `radiusInKm` changes.

---

## 9. Errors

| Status | Message | Frontend action |
|--------|---------|-----------------|
| `400` | `Province is required` | Signup form: require the province dropdown |
| `400` | `Please update your province in profile before creating a consultation` | Redirect to Edit Profile |
| `400` | `Please update your city and country in profile before creating a consultation` | Redirect to Edit Profile |
| `400` | `Invalid enum value ... scope` | Only send `canada`, `province` or `city` |
| `400` | `radiusInKm must be one of: 1, 5, 10, 25, 50, 100, 250, 500` | Only send the listed values |
| `401` | Unauthorized | Re-login |

---

## 10. Frontend Checklist

- [ ] Add a Province/Territory dropdown to **Signup** and send `province`
- [ ] Add a Province/Territory dropdown to **Edit Profile** and send `province` inside `data`
- [ ] If `profile.province` is `null`, prompt the user to complete their profile
- [ ] Add a 3-option location selector to the Consult feed, defaulting to **Province**
- [ ] Show the radius selector **only** when City is selected
- [ ] Send `scope` (and `radiusInKm` for City) to `GET /consult/all`
- [ ] Display `province` on consult cards if needed (e.g. "Toronto, Ontario")
- [ ] Handle the "update your province" error on Create Consultation
- [ ] Don't send `province` in the Create Consultation body; the backend reads it from the profile

---

## Backend note (existing data)

Existing consult posts have no province. After users set their province, run:

```bash
npm run backfill:consult-province          # dry run
npm run backfill:consult-province -- --fix # apply
```

This copies each author's profile province onto their older posts so they appear in the Provincewide feed.
