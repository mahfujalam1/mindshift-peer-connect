# Live Discussion — File & Image Upload API Docs

> Documentation for sending messages with file/image attachments in **Live Discussion (Group Message)**.  
> 1:1 chat equivalent: `POST /api/v1/chat/upload-file`

---

## 1. Overview

| Property | Value |
| :--- | :--- |
| **Endpoint** | `/api/v1/live-discussion/upload-file` |
| **Method** | `POST` |
| **Authentication** | `Authorization: Bearer {{accessToken}}` |
| **Content-Type** | `multipart/form-data` |
| **Max File Size** | `50 MB` |

When a file or image is sent:
1. Multer uploads the file directly to AWS S3.
2. A new `LiveMessage` document is saved in MongoDB.
3. The room's `lastMessage` is updated.
4. Real-time Socket.IO event `new_live_message` is broadcast to everyone inside the room.
5. `my_live_rooms` and `live_rooms` socket events are triggered to update conversation lists.

---

## 2. Request Specifications

### Form-Data Fields

| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` *(or `chat_file` / `image`)* | `File` | **Yes** | Image or file binary to upload. |
| `roomId` | `String` | **Yes** | The 24-character ObjectId of the live discussion room. |
| `text` | `String` | No | Optional caption/message text. |
| `replyTo` | `String` | No | Optional `_id` of the message being replied to (must belong to same room). |

---

## 3. Response Structure

### Success (`201 Created`)

```json
{
  "statusCode": 201,
  "success": true,
  "message": "Live discussion message sent with file successfully",
  "data": {
    "message": {
      "_id": "673c68a442e9a2b7e1933c14",
      "room": "673c678042e9a2b7e1933b90",
      "sender": {
        "_id": "673b5f90e5fa3f0012345678",
        "fullName": "John Doe",
        "email": "johndoe@example.com",
        "profileImage": "https://cdn.example.com/profile/avatar.png"
      },
      "text": "Check out this screenshot!",
      "file": "https://cdn.example.com/chat_file/1732008100-screenshot.png",
      "isEdited": false,
      "replyTo": null,
      "replyToSnapshot": null,
      "reactions": [],
      "reactionSummary": {},
      "createdAt": "2026-10-26T12:20:00.000Z",
      "updatedAt": "2026-10-26T12:20:00.000Z"
    },
    "uploadedFile": {
      "url": "https://cdn.example.com/chat_file/1732008100-screenshot.png",
      "key": "chat_file/1732008100-screenshot.png",
      "originalName": "screenshot.png",
      "mimetype": "image/png",
      "size": 245120
    }
  }
}
```

---

## 4. Socket.IO Real-time Events

> **Note for Frontend:** No new socket listeners are required.

When this API is called, the server emits:
* **Event:** `new_live_message`
* **Room:** Emitted to `io.to(roomId)`
* **Payload:** Populated message object (with full CDN file URL).

Also triggers `my_live_rooms` and `live_rooms` for refreshing room previews.

---

## 5. Error Responses

| Status Code | Message | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `"Valid roomId is required"` | `roomId` is missing or invalid. |
| `400 Bad Request` | `"Provide at least one file to upload"` | No file was attached in `file`, `chat_file`, or `image`. |
| `403 Forbidden` | `"You are not a member of this room. Please join first."` | The user is not in the room's `members` list. |
| `404 Not Found` | `"Live discussion room not found"` | Room with given ID does not exist. |

---

## 6. Frontend Integration Examples

### JavaScript (Fetch API)

```javascript
const sendLiveDiscussionFile = async (roomId, file, text = '', replyTo = null, token) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('roomId', roomId);
  if (text) formData.append('text', text);
  if (replyTo) formData.append('replyTo', replyTo);

  const res = await fetch(`${API_BASE_URL}/api/v1/live-discussion/upload-file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return await res.json();
};
```

### React Native / Axios

```javascript
import axios from 'axios';

const uploadLiveFile = async (roomId, fileAsset, text, token) => {
  const formData = new FormData();
  formData.append('file', {
    uri: fileAsset.uri,
    type: fileAsset.type || 'image/jpeg',
    name: fileAsset.fileName || 'upload.jpg',
  });
  formData.append('roomId', roomId);
  if (text) formData.append('text', text);

  const res = await axios.post(
    `${API_BASE_URL}/api/v1/live-discussion/upload-file`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return res.data;
};
```
