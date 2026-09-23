# Live Discussion (Group Message) — Reply & Reaction API Docs

> Extra documentation for **group / live discussion** only.  
> 1:1 chat docs: `docs/chat-reply-reaction-api.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Message Shape](#2-message-shape)
3. [REST APIs](#3-rest-apis)
4. [Socket.IO Events](#4-socketio-events)
5. [App Integration Flows](#5-app-integration-flows)
6. [Settings (shared with 1:1)](#6-settings-shared-with-11)
7. [Common Errors](#7-common-errors)

---

## 1. Overview

| Item | Value |
|------|--------|
| Base URL | `{{BASE_URL}}/api/v1/live-discussion` |
| Auth | `Authorization: Bearer {{accessToken}}` |
| Allowed emojis | `👍` `❤️` `😂` `😮` `😢` `🙏` `🔥` `👏` |

**Same rules as 1:1**

- One reaction per user
- Same emoji again → remove
- Different emoji → replace
- Dashboard toggles (`/settings/chat`) also apply here

### Endpoint Collection

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | `GET` | `/live-discussion/` | All rooms |
| 2 | `POST` | `/live-discussion/join/:roomId` | Join room |
| 3 | `GET` | `/live-discussion/room/:roomId` | Room details |
| 4 | `GET` | `/live-discussion/my-joined-rooms` | My rooms |
| 5 | `GET` | `/live-discussion/messages/:roomId` | Message history |
| 6 | `GET` | `/live-discussion/messages/:roomId/around/:messageId` | Jump to message |
| 7 | `POST` | `/live-discussion/messages/:messageId/react` | React to message |

**Socket (preferred for live group chat)**

| Emit | Listen |
|------|--------|
| `join_live_discussion` | — |
| `get_live_messages` | `live_messages` |
| `send_live_message` | `new_live_message` |
| `react_live_message` | `live_message_reacted` |
| — | `live_message_error` / `live_messages_error` |

---

## 2. Message Shape

```json
{
  "_id": "liveMsgId",
  "room": "roomId",
  "sender": {
    "_id": "...",
    "fullName": "Alice",
    "email": "...",
    "profileImage": "..."
  },
  "text": "Yes, agreed",
  "file": null,
  "replyTo": {
    "_id": "originalLiveMsgId",
    "text": "Anyone free tomorrow?",
    "file": null,
    "sender": {
      "_id": "...",
      "fullName": "Bob",
      "profileImage": "..."
    }
  },
  "replyToSnapshot": {
    "_id": "originalLiveMsgId",
    "text": "Anyone free tomorrow?",
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
      "createdAt": "2026-09-23T12:00:00.000Z"
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
| `replyTo` | Live populate of original live message |
| `replyToSnapshot` | Frozen quote preview |
| `reactions` | Per-user reactions |
| `reactionSummary` | Emoji count map |

---

## 3. REST APIs

### 3.1 Get Messages

```http
GET {{BASE_URL}}/api/v1/live-discussion/messages/{{roomId}}
```

Each message includes `replyTo`, `replyToSnapshot`, `reactions`, `reactionSummary`.

---

### 3.2 Jump To Message (Around)

```http
GET {{BASE_URL}}/api/v1/live-discussion/messages/{{roomId}}/around/{{messageId}}?before=12&after=12
```

| Query | Default | Max |
|-------|---------|-----|
| `before` | `12` | `50` |
| `after` | `12` | `50` |

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Live discussion messages around target retrieved successfully",
  "data": {
    "targetMessageId": "liveMsgId",
    "messages": ["...before...", "...target...", "...after..."],
    "hasMoreBefore": true,
    "hasMoreAfter": false
  }
}
```

> Must be a room member. Highlight `targetMessageId`.

---

### 3.3 React To Live Message

```http
POST {{BASE_URL}}/api/v1/live-discussion/messages/{{messageId}}/react
```

**Body**

```json
{
  "emoji": "❤️"
}
```

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reaction added successfully",
  "data": {
    "action": "added",
    "roomId": "roomId",
    "message": {
      "_id": "liveMsgId",
      "reactions": [],
      "reactionSummary": {}
    }
  }
}
```

`action` = `added` | `replaced` | `removed`

Also emits socket event to room: `live_message_reacted`

---

## 4. Socket.IO Events

Join the room socket channel first (after REST join).

### 4.1 Join room channel

```js
socket.emit("join_live_discussion", {
  roomId: "66f1room0000000000000001"
});
```

### 4.2 Get history

```js
socket.emit("get_live_messages", {
  roomId: "66f1room0000000000000001"
});

socket.on("live_messages", (messages) => {
  // each message has reply + reactions + reactionSummary
});
```

---

### 4.3 `send_live_message` (send + reply)

**Client emits**

```js
socket.emit("send_live_message", {
  roomId: "66f1room0000000000000001",
  text: "Yes, agreed",
  replyTo: "66f1liveMsg0000000000001", // optional
  file: null                             // optional
});
```

| Field | Required | Notes |
|-------|----------|-------|
| `roomId` | yes | Live discussion room id |
| `text` / `file` | one required | Message content |
| `replyTo` | no | Same-room live message id |

**DB saves**

```json
{
  "room": "roomId",
  "text": "Yes, agreed",
  "replyTo": "66f1liveMsg0000000000001",
  "replyToSnapshot": {
    "_id": "66f1liveMsg0000000000001",
    "text": "Anyone free tomorrow?",
    "senderName": "Bob",
    "senderId": "userB",
    "file": null
  }
}
```

**Server emits**

| Event | To | Meaning |
|-------|----|---------|
| `new_live_message` | Room members (joined socket room) | New message with reply fields |
| `live_message_error` | Sender | Validation / failure |
| `live_rooms` | Broadcast | Room list refresh |

---

### 4.4 `react_live_message`

**Client emits**

```js
socket.emit("react_live_message", {
  messageId: "66f1liveMsg0000000000001",
  emoji: "😂"
});
```

**Client listens**

```js
socket.on("live_message_reacted", (payload) => {
  // payload.action = "added" | "replaced" | "removed"
  // payload.message = full live message
});
```

**Example payload**

```json
{
  "messageId": "66f1liveMsg0000000000001",
  "roomId": "66f1room0000000000000001",
  "action": "added",
  "message": {
    "_id": "66f1liveMsg0000000000001",
    "reactions": [
      {
        "user": { "_id": "userA", "fullName": "Alice" },
        "emoji": "😂",
        "createdAt": "..."
      }
    ],
    "reactionSummary": { "😂": 1 }
  }
}
```

---

### 4.5 Socket Cheat Sheet (Group)

| Direction | Event | Purpose |
|-----------|--------|---------|
| Client → | `join_live_discussion` | Join socket room channel |
| Client → | `get_live_messages` | Load history |
| Client → | `send_live_message` | Send (+ optional `replyTo`) |
| Client → | `react_live_message` | Toggle / replace reaction |
| Server → | `live_messages` | History list |
| Server → | `new_live_message` | Incoming group message |
| Server → | `live_message_reacted` | Reaction changed |
| Server → | `live_message_error` | Error `{ message }` |
| Server → | `live_rooms` | Room list refresh |

---

## 5. App Integration Flows

### A) Reply in group room

1. User must REST join room + socket `join_live_discussion`
2. Check `GET /settings/chat` → if `reply: false` hide reply UI
3. Emit `send_live_message` with `replyTo`
4. Render quote from `replyToSnapshot`
5. Quote tap → `GET /live-discussion/messages/:roomId/around/:messageId`
6. Highlight `targetMessageId`

### B) Reaction in group room

1. If `reaction: false` hide emoji UI
2. Emit `react_live_message` or REST react
3. On `live_message_reacted` update that message in local list

---

## 6. Settings (shared with 1:1)

Same dashboard toggles:

```http
GET  {{BASE_URL}}/api/v1/settings/chat
PATCH {{BASE_URL}}/api/v1/settings/chat
```

```json
{ "feature": "reply", "status": false }
```

```json
{ "feature": "reaction", "status": false }
```

When OFF → live reply / react also returns `403` / `live_message_error`.

---

## 7. Common Errors

| Status / Event | Meaning |
|----------------|---------|
| `400` | Invalid id / invalid emoji / replyTo not in same room |
| `401` | Missing / invalid token |
| `403` | Not a room member / feature disabled |
| `404` | Room / message not found |
| `live_message_error` | Socket errors (same messages) |

**Feature-disabled**

- `Message reply is currently disabled`
- `Message reaction is currently disabled`

---

## Quick Diff vs 1:1 Chat

| Feature | 1:1 Chat | Live Discussion (Group) |
|---------|----------|-------------------------|
| Send | `send_message` | `send_live_message` |
| Reply field | `replyTo` | `replyTo` (same) |
| React emit | `react_message` | `react_live_message` |
| React listen | `message_reacted` | `live_message_reacted` |
| Around REST | `/chat/messages/:convId/around/:msgId` | `/live-discussion/messages/:roomId/around/:msgId` |
| React REST | `/chat/messages/:msgId/react` | `/live-discussion/messages/:msgId/react` |
| Collection | `Message` | `LiveMessage` |
| Settings | `/settings/chat` | same |
