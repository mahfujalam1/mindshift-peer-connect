# Chirine Chat API Documentation

> For App Developers · REST + Socket.IO · Reply · Reaction · Jump · Settings

---

## Table of Contents

1. [Overview](#1-overview)
2. [Message Shape](#2-message-shape)
3. [REST APIs](#3-rest-apis)
4. [Socket.IO Events](#4-socketio-events)
5. [App Integration Flows](#5-app-integration-flows)
6. [Common Errors](#6-common-errors)
7. [Postman Variables](#7-postman-variables)

---

## 1. Overview

| Item | Value |
|------|--------|
| Base URL | `{{BASE_URL}}/api/v1` |
| Auth header | `Authorization: Bearer {{accessToken}}` |
| Allowed reaction emojis | `👍` `❤️` `😂` `😮` `😢` `🙏` `🔥` `👏` |

**Reaction rules**

- One reaction per user
- Same emoji again → **remove**
- Different emoji → **replace**

**Feature toggles (default ON)**

- `reply` and `reaction` default = `true`
- When OFF → API / socket returns `403`
- Normal text / file messages still work

### Endpoint Collection

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | `POST` | `/chat/create-conversation` | Start / get conversation |
| 2 | `GET` | `/chat/conversations` | Conversation list (+ search) |
| 3 | `GET` | `/chat/messages/:conversationId` | Message history |
| 4 | `GET` | `/chat/messages/:conversationId/around/:messageId` | Jump to message |
| 5 | `POST` | `/chat/upload-file` | Send file / asset (+ reply) |
| 6 | `PATCH` | `/chat/messages/:messageId` | Edit message text |
| 7 | `POST` | `/chat/messages/:messageId/react` | Add / replace / remove reaction |
| 8 | `GET` | `/settings/chat` | Get reply / reaction on-off status |
| 9 | `PATCH` | `/settings/chat` | Admin: toggle reply / reaction |

**Socket (preferred for live chat)**

| Emit | Listen |
|------|--------|
| `send_message` | `message_sent`, `new_message` |
| `update_message` | `message_updated` |
| `react_message` | `message_reacted` |
| — | `message_error`, `conversations` |

---

## 2. Message Shape

All history + socket payloads use this shape:

```json
{
  "_id": "msgId",
  "conversation": "convId",
  "sender": {
    "_id": "...",
    "fullName": "...",
    "profileImage": "..."
  },
  "receiver": {
    "_id": "...",
    "fullName": "...",
    "profileImage": "..."
  },
  "text": "Yes, 3pm works",
  "file": null,
  "asset": null,
  "status": "delivered",
  "isEdited": false,
  "replyTo": {
    "_id": "originalMsgId",
    "text": "Can we meet tomorrow?",
    "file": null,
    "sender": {
      "_id": "...",
      "fullName": "Bob",
      "profileImage": "..."
    }
  },
  "replyToSnapshot": {
    "_id": "originalMsgId",
    "text": "Can we meet tomorrow?",
    "file": null,
    "senderName": "Bob",
    "senderId": "userB"
  },
  "reactions": [
    {
      "user": {
        "_id": "...",
        "fullName": "Alice",
        "profileImage": "..."
      },
      "emoji": "👍",
      "createdAt": "2026-09-23T10:06:00.000Z"
    }
  ],
  "reactionSummary": {
    "👍": 1
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

| Field | Description |
|-------|-------------|
| `replyTo` | Live populate of original message (may be `null` if deleted) |
| `replyToSnapshot` | Frozen quote preview for UI |
| `reactions` | Per-user reaction list |
| `reactionSummary` | Emoji → count map for badges |
| `isEdited` | `true` after text edit |

---

## 3. REST APIs

### 3.1 Create Conversation

```http
POST {{BASE_URL}}/api/v1/chat/create-conversation
```

**Headers**

| Key | Value |
|-----|-------|
| Authorization | `Bearer {{accessToken}}` |
| Content-Type | `application/json` |

**Body**

```json
{
  "partnerId": "66f1a2b3c4d5e6f7a8b9c0d1"
}
```

**Response `201`**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Conversation created successfully",
  "data": {
    "_id": "66f1conv0000000000000001",
    "participants": [
      { "_id": "userA", "fullName": "Alice" },
      { "_id": "userB", "fullName": "Bob" }
    ],
    "lastMessage": null,
    "createdAt": "2026-09-23T10:00:00.000Z",
    "updatedAt": "2026-09-23T10:00:00.000Z"
  }
}
```

---

### 3.2 Get Conversations

```http
GET {{BASE_URL}}/api/v1/chat/conversations?searchTerm=alice&page=1&limit=20&sort=-updatedAt
```

**Headers**

| Key | Value |
|-----|-------|
| Authorization | `Bearer {{accessToken}}` |

**Query**

| Key | Required | Example | Description |
|-----|----------|---------|-------------|
| `searchTerm` | no | `alice` | Search partner by fullName / email |
| `page` | no | `1` | Page number |
| `limit` | no | `20` | Page size |
| `sort` | no | `-updatedAt` | Sort field |

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Conversations retrieved successfully",
  "data": [
    {
      "_id": "66f1conv0000000000000001",
      "lastMessage": {
        "_id": "msg1",
        "text": "Hello",
        "replyToSnapshot": null,
        "reactions": []
      },
      "receiver": {
        "_id": "userB",
        "fullName": "Alice Smith",
        "email": "alice@example.com",
        "profileImage": "https://...",
        "isBlocked": false
      },
      "updatedAt": "2026-09-23T10:05:00.000Z"
    }
  ]
}
```

---

### 3.3 Get Message History

```http
GET {{BASE_URL}}/api/v1/chat/messages/{{conversationId}}?page=1&limit=20&sort=-createdAt
```

**Path**

| Key | Example |
|-----|---------|
| `conversationId` | `66f1conv0000000000000001` |

**Query**

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `page` | no | `1` | Page |
| `limit` | no | `20` | Page size |
| `sort` | no | `-createdAt` | Sort |

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Message history retrieved successfully",
  "data": [ "...messages with reply + reactions..." ],
  "receiver": {
    "id": "userB",
    "fullName": "Bob",
    "profileImage": "https://...",
    "isOnline": true,
    "isBlocked": false
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPage": 3
  }
}
```

---

### 3.4 Jump To Message (Around Context)

Use when user taps a reply quote.

```http
GET {{BASE_URL}}/api/v1/chat/messages/{{conversationId}}/around/{{messageId}}?before=12&after=12
```

**Path**

| Key | Example |
|-----|---------|
| `conversationId` | `66f1conv0000000000000001` |
| `messageId` | `66f1msg0000000000000001` |

**Query**

| Key | Default | Max | Description |
|-----|---------|-----|-------------|
| `before` | `12` | `50` | Messages before target |
| `after` | `12` | `50` | Messages after target |

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Messages around target retrieved successfully",
  "data": {
    "targetMessageId": "66f1msg0000000000000001",
    "messages": [
      { "_id": "msg_before_2", "text": "..." },
      { "_id": "msg_before_1", "text": "..." },
      {
        "_id": "66f1msg0000000000000001",
        "text": "Can we meet tomorrow?",
        "reactions": [],
        "reactionSummary": {}
      },
      { "_id": "msg_after_1", "text": "Yes, 3pm works" }
    ],
    "hasMoreBefore": true,
    "hasMoreAfter": false
  }
}
```

> Scroll to / highlight `targetMessageId`. Order = oldest → newest.

---

### 3.5 Upload File / Reply (REST)

```http
POST {{BASE_URL}}/api/v1/chat/upload-file
```

**Headers**

| Key | Value |
|-----|-------|
| Authorization | `Bearer {{accessToken}}` |
| Content-Type | `multipart/form-data` |

**Body (form-data)**

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `conversationId` | Text | yes | Conversation id |
| `chat_file` / `file` | File | one of file / assetUrl | Uploaded file |
| `assetUrl` | Text | one of file / assetUrl | Existing chat asset |
| `text` | Text | no | Caption |
| `replyTo` | Text | no | Message id to reply to |

**Response `201`**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Message sent with file successfully",
  "data": {
    "message": {
      "_id": "66f1msg0000000000000009",
      "text": "Check this",
      "file": "https://cdn.example.com/uploads/chat/files/abc.jpg",
      "replyTo": "66f1msg0000000000000001",
      "replyToSnapshot": {
        "_id": "66f1msg0000000000000001",
        "text": "Can we meet tomorrow?",
        "file": null,
        "senderName": "Bob",
        "senderId": "userB"
      },
      "reactions": [],
      "reactionSummary": {}
    },
    "uploadedFile": {
      "url": "https://cdn.example.com/uploads/chat/files/abc.jpg",
      "key": "uploads/chat/files/abc.jpg",
      "originalName": "photo.jpg",
      "mimetype": "image/jpeg",
      "size": 245678
    }
  }
}
```

---

### 3.6 Edit Message (REST)

```http
PATCH {{BASE_URL}}/api/v1/chat/messages/{{messageId}}
```

**Body**

```json
{
  "text": "Yes, 4pm works instead"
}
```

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Message updated successfully",
  "data": {
    "_id": "66f1msg0000000000000002",
    "text": "Yes, 4pm works instead",
    "isEdited": true,
    "reactions": [],
    "reactionSummary": {}
  }
}
```

Also emits socket event: `message_updated`

---

### 3.7 React To Message (REST)

```http
POST {{BASE_URL}}/api/v1/chat/messages/{{messageId}}/react
```

**Body**

```json
{
  "emoji": "❤️"
}
```

**Response `200` — added**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reaction added successfully",
  "data": {
    "action": "added",
    "message": {
      "_id": "66f1msg0000000000000002",
      "text": "Yes, 3pm works",
      "reactions": [
        {
          "user": {
            "_id": "userA",
            "fullName": "Alice",
            "profileImage": "https://..."
          },
          "emoji": "❤️",
          "createdAt": "2026-09-23T10:10:00.000Z"
        }
      ],
      "reactionSummary": {
        "❤️": 1
      }
    }
  }
}
```

**Response `200` — removed** (same emoji again)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reaction removed successfully",
  "data": {
    "action": "removed",
    "message": {
      "_id": "66f1msg0000000000000002",
      "reactions": [],
      "reactionSummary": {}
    }
  }
}
```

`action` = `added` | `replaced` | `removed`

---

### 3.8 Get Chat Settings (App + Dashboard)

```http
GET {{BASE_URL}}/api/v1/settings/chat
```

Roles: `user`, `admin`

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chat settings retrieved successfully",
  "data": {
    "reply": true,
    "reaction": true
  }
}
```

---

### 3.9 Update Chat Setting (Dashboard Admin Only)

```http
PATCH {{BASE_URL}}/api/v1/settings/chat
```

Roles: `admin` only

**Body — turn OFF reply**

```json
{
  "feature": "reply",
  "status": false
}
```

**Body — turn ON reaction**

```json
{
  "feature": "reaction",
  "status": true
}
```

| Field | Type | Values |
|-------|------|--------|
| `feature` | string | `reply` \| `reaction` |
| `status` | boolean | `true` = ON, `false` = OFF |

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chat reply setting updated successfully",
  "data": {
    "reply": false,
    "reaction": true
  }
}
```

| When OFF | Blocked |
|----------|---------|
| `reply: false` | `replyTo` on `send_message` / upload-file → `403` |
| `reaction: false` | REST react + socket `react_message` → `403` |

---

## 4. Socket.IO Events

Connect with the same auth token used for REST.

### 4.1 `send_message` (send + reply)

**Client emits**

```js
socket.emit("send_message", {
  conversationId: "66f1conv0000000000000001",
  text: "Yes, 3pm works",
  replyTo: "66f1msg0000000000000001", // optional
  file: null,                          // optional
  assetId: null                        // optional
});
```

| Field | Required | Notes |
|-------|----------|-------|
| `conversationId` | yes | Conversation id |
| `text` / `file` / `assetId` | one required | Message content |
| `replyTo` | no | Same-conversation message id |

**Server emits**

| Event | To | Meaning |
|-------|----|---------|
| `message_sent` | Sender | Ack with full message |
| `new_message` | Receiver (online) | Incoming message |
| `message_error` | Sender | Validation / failure |
| `conversations` | Both | List refresh |

---

### 4.2 `update_message` (edit text)

**Client emits**

```js
socket.emit("update_message", {
  messageId: "66f1msg0000000000000002",
  text: "Updated text here"
});
```

| Field | Required | Rules |
|-------|----------|-------|
| `messageId` | yes | Valid ObjectId; must be your own message |
| `text` | yes | Non-empty trimmed string |

**Server behavior**

1. Validates `messageId` + non-empty `text`
2. Only original sender can update
3. Sets `isEdited = true`
4. Emits `message_updated` to **both** participants
5. Refreshes `conversations` for both users

**Client listens**

```js
socket.on("message_updated", (message) => {
  // Replace local message by message._id
  // Show "edited" badge when message.isEdited === true
});
```

**Example `message_updated` payload**

```json
{
  "_id": "66f1msg0000000000000002",
  "conversation": "66f1conv0000000000000001",
  "text": "Updated text here",
  "isEdited": true,
  "replyTo": null,
  "replyToSnapshot": null,
  "reactions": [],
  "reactionSummary": {},
  "sender": {
    "_id": "userA",
    "fullName": "Alice",
    "profileImage": "..."
  },
  "receiver": {
    "_id": "userB",
    "fullName": "Bob",
    "profileImage": "..."
  },
  "status": "delivered",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Errors**

```js
socket.on("message_error", (err) => {
  // err.message examples:
  // "Valid messageId is required"
  // "Message text cannot be empty"
  // "You can only update your own messages"
  // "Message not found"
});
```

---

### 4.3 `react_message`

**Client emits**

```js
socket.emit("react_message", {
  messageId: "66f1msg0000000000000002",
  emoji: "😂"
});
```

**Client listens**

```js
socket.on("message_reacted", (payload) => {
  // payload.action = "added" | "replaced" | "removed"
  // payload.message = full message with reactions + reactionSummary
});
```

**Example `message_reacted` payload**

```json
{
  "messageId": "66f1msg0000000000000002",
  "conversationId": "66f1conv0000000000000001",
  "action": "added",
  "message": {
    "_id": "66f1msg0000000000000002",
    "reactions": [
      {
        "user": { "_id": "userA", "fullName": "Alice" },
        "emoji": "😂",
        "createdAt": "2026-09-23T10:12:00.000Z"
      }
    ],
    "reactionSummary": { "😂": 1 }
  }
}
```

---

### 4.4 Socket Cheat Sheet

| Direction | Event | Purpose |
|-----------|--------|---------|
| Client → | `send_message` | Send (+ optional `replyTo`) |
| Client → | `update_message` | Edit own message text |
| Client → | `react_message` | Toggle / replace reaction |
| Server → | `message_sent` | Send acknowledgement |
| Server → | `new_message` | Incoming message |
| Server → | `message_updated` | Message was edited |
| Server → | `message_reacted` | Reaction changed |
| Server → | `message_error` | Error `{ message }` |
| Server → | `conversations` | Conversation list refresh |

---

## 5. App Integration Flows

### A) Reply + jump

1. Chat open → `GET /settings/chat`
2. If `reply: false` → hide reply UI
3. Send with `replyTo` via `send_message`
4. Render quote from `replyToSnapshot`
5. Quote tap → `GET .../around/:messageId`
6. Highlight `data.targetMessageId`

### B) Reaction

1. If `reaction: false` → hide emoji UI
2. Emit `react_message` or REST react
3. On `message_reacted` → update local `reactions` + `reactionSummary`

### C) Edit message (socket update)

1. User edits bubble → emit `update_message`
2. On `message_updated` → replace message in list by `_id`
3. Show edited indicator when `isEdited === true`

### D) Dashboard toggle

1. Admin → `GET /settings/chat` (show switches)
2. Flip switch → `PATCH /settings/chat` with `{ feature, status }`
3. App re-fetches settings on next open

---

## 6. Common Errors

| Status | Meaning |
|--------|---------|
| `400` | Invalid id / empty text / invalid emoji / replyTo wrong conversation |
| `401` | Missing / invalid token |
| `403` | Not participant / not owner / blocked / **feature disabled** |
| `404` | Conversation / message not found |

**Feature-disabled messages**

- `Message reply is currently disabled`
- `Message reaction is currently disabled`

---

## 7. Postman Variables

| Variable | Example |
|----------|---------|
| `BASE_URL` | `http://localhost:5000` |
| `accessToken` | `eyJhbGciOi...` |
| `adminToken` | `eyJhbGciOi...` (admin role) |
| `conversationId` | `66f1conv...` |
| `messageId` | `66f1msg...` |
| `partnerId` | `66f1user...` |
