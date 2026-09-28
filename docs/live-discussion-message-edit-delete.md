# Live discussion: edit and delete messages

These endpoints and socket events apply to live discussion group messages. The server derives the sender from the authenticated user; never send a user ID to authorize an edit or deletion.

## Rules

- Only the message sender can edit/delete it, and they must still be a room member. Admin role does not bypass ownership.
- Edit changes text/caption only. Text is trimmed and must be a non-empty string. Attachments, reactions and reply references remain intact. The message receives `isEdited: true`; its original `createdAt` stays unchanged.
- Delete permanently removes the message document, including its reactions, for everyone. There is no undo or "delete for me" mode.
- Replies to a deleted message remain, but their `replyTo` and `replyToSnapshot` are cleared. Uploaded files are not removed from storage.
- If the deleted message was the room's last message, the preview points to the latest remaining message, or `null` when the room is empty.
- Existing messages without `isEdited` should be displayed as unedited. No backfill is needed.
- Reply/reaction feature switches do not disable editing/deletion.

## REST API

Base path: `/api/v1/live-discussion`

Use `Authorization: Bearer <accessToken>`. Use `Content-Type: application/json` for edit requests.

### Edit

`PATCH /api/v1/live-discussion/messages/:messageId`

```json
{ "text": "Updated message text" }
```

HTTP 200 response (message fields abbreviated):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Live discussion message updated successfully",
  "data": {
    "roomId": "ROOM_ID",
    "messageId": "MESSAGE_ID",
    "message": {
      "_id": "MESSAGE_ID",
      "room": "ROOM_ID",
      "text": "Updated message text",
      "isEdited": true,
      "reactions": [],
      "reactionSummary": {}
    }
  }
}
```

`data.message` contains the populated message, including sender, reply information, reactions and timestamps.

### Delete

`DELETE /api/v1/live-discussion/messages/:messageId`

No request body is required.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Live discussion message deleted successfully",
  "data": { "roomId": "ROOM_ID", "messageId": "MESSAGE_ID" }
}
```

Deleting the same message again returns 404.

## Socket.IO

Use the existing authenticated socket connection. First become a member through `POST /api/v1/live-discussion/join/:roomId`, then subscribe to the room on each connection/reconnection:

```js
socket.emit('join_live_discussion', { roomId });
```

Send an edit:

```js
socket.emit('update_live_message', {
  messageId,
  text: 'Updated message text'
});
```

Send a deletion:

```js
socket.emit('delete_live_message', { messageId });
```

Choose REST or socket for each mutation; do not send both. Both transports use the same service and emit the same room notifications:

| Server event | Payload | Frontend action |
| --- | --- | --- |
| `live_message_updated` | `{ roomId, messageId, message }` | Replace the message by ID and show an edited label. |
| `live_message_deleted` | `{ roomId, messageId }` | Remove the message and clear any cached reply preview referencing it. |
| `live_rooms` | Updated array of all rooms | Refresh the room list. |
| `my_live_rooms` | Updated array of joined rooms | Refresh the user's joined room list. |
| `live_message_error` | `{ message }` | Show the socket error; keep current message state. |

Room notifications reach sockets subscribed to that room, including the sender's subscribed sockets. There is no callback acknowledgement for these mutation events. A REST caller can also apply `response.data` immediately; handling a subsequent broadcast must be safe to repeat.

## Frontend state example

This example assumes `setMessages` updates only the currently open room's messages. Replace the state helpers with equivalents from your framework.

```js
const idOf = (value) => value?._id ?? value;

function onUpdated({ roomId, messageId, message }) {
  if (roomId !== activeRoomId) return;
  setMessages((items) => items.map((item) => {
    if (item._id === messageId) return message;
    // Refresh a currently rendered quote of the edited message.
    if (idOf(item.replyTo) === messageId) {
      return { ...item, replyTo: message };
    }
    return item;
  }));
}

function onDeleted({ roomId, messageId }) {
  if (roomId !== activeRoomId) return;
  setMessages((items) => items
    .filter((item) => item._id !== messageId)
    .map((item) => {
      if (idOf(item.replyTo) === messageId || item.replyToSnapshot?._id === messageId) {
        return { ...item, replyTo: null, replyToSnapshot: null };
      }
      return item;
    }));
  // Also close any edit form/reply composer targeting the deleted message.
}

socket.on('live_message_updated', onUpdated);
socket.on('live_message_deleted', onDeleted);

// On cleanup/room change:
// socket.off('live_message_updated', onUpdated);
// socket.off('live_message_deleted', onDeleted);
```

Show edit/delete controls only when `idOf(message.sender) === currentUserId`; the backend enforces this independently. Display `message.isEdited === true` as edited.

For reply previews, prefer populated `replyTo` over `replyToSnapshot`: the snapshot captures the original text when the reply was created and is not rewritten on edit. Deletion clears both fields in stored replies.

Refetch messages and room lists after reconnecting because missed socket events are not replayed. Existing fetch options include `GET /api/v1/live-discussion/messages/:roomId` and socket `get_live_messages` with `{ roomId }` (response event: `live_messages`).

## Errors

| HTTP status | Meaning |
| --- | --- |
| 400 | Invalid message ID, missing/non-string text, or blank edit text. |
| 401 | Missing/invalid authentication, handled by the existing auth middleware. |
| 403 | User is not a room member or is not the message sender. |
| 404 | Message or room does not exist, including an already deleted message. |

Socket failures use `live_message_error` with a readable `message`, rather than HTTP status codes.

## Verification and limits

```sh
npm run build -- --noEmit
node --test tests/live-discussion-message-mutations.test.cjs
```

The automated service tests isolate MongoDB/socket dependencies and cover ownership, membership, invalid input, edit preservation, delete cleanup, room preview fallback and event payloads. They are not a live MongoDB or multi-client integration test.

Deletion and its reply/room cleanup use multiple database operations, not a transaction. Notification errors are logged after persistence; clients can recover by refetching. File storage cleanup is outside this endpoint.
