const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  LevelFormat,
} = require('docx');
const fs = require('fs');
const path = require('path');

const PAGE_WIDTH = 12240;
const MARGIN = 720;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const headerShading = { type: ShadingType.CLEAR, fill: '1F4E79' };
const codeShading = { type: ShadingType.CLEAR, fill: 'F5F5F5' };

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120 },
    ...opts,
    children: [
      new TextRun({
        text,
        font: 'Calibri',
        size: 22,
        ...(opts.run || {}),
      }),
    ],
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, font: 'Calibri', size: 32, color: '1F4E79' })],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, font: 'Calibri', size: 26, color: '2E75B6' })],
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, font: 'Calibri', size: 22, color: '404040' })],
  });

const label = (text) =>
  new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, font: 'Calibri', size: 22 })],
  });

const codeBlock = (lines) =>
  String(lines)
    .split('\n')
    .map(
      (line) =>
        new Paragraph({
          spacing: { after: 0 },
          shading: codeShading,
          children: [
            new TextRun({
              text: line.length ? line : ' ',
              font: 'Consolas',
              size: 18,
            }),
          ],
        })
    );

const cell = (text, opts = {}) =>
  new TableCell({
    borders,
    width: { size: opts.width || 2000, type: WidthType.DXA },
    shading: opts.header ? headerShading : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text),
            font: 'Calibri',
            size: 18,
            bold: !!opts.header,
            color: opts.header ? 'FFFFFF' : '000000',
          }),
        ],
      }),
    ],
  });

const makeTable = (headers, rows, colWidths) =>
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: headers.map((h, i) => cell(h, { header: true, width: colWidths[i] })),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((v, i) => cell(v, { width: colWidths[i] })),
          })
      ),
    ],
  });

const bullet = (text) =>
  new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: 'Calibri', size: 22 })],
  });

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: 'Chirine Chat API Documentation',
        bold: true,
        font: 'Calibri',
        size: 40,
        color: '1F4E79',
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: 'Reply • Reaction • Jump-to-message • Settings • Socket',
        font: 'Calibri',
        size: 22,
        color: '666666',
        italics: true,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [
      new TextRun({
        text: 'For App Developers  |  Postman + Socket.IO  |  Sep 2026',
        font: 'Calibri',
        size: 20,
        color: '888888',
      }),
    ],
  }),

  h1('1. Overview'),
  p('Base URL: {{BASE_URL}}/api/v1'),
  p('Auth header (all REST): Authorization: Bearer {{accessToken}}'),
  p('Allowed reaction emojis: 👍  ❤️  😂  😮  😢  🙏  🔥  👏'),
  p('Reaction rules: one reaction per user. Same emoji again = remove. Different emoji = replace.'),
  p('Default chat settings: reply=ON, reaction=ON. When OFF, API/socket returns 403.'),

  h2('Endpoint collection'),
  makeTable(
    ['#', 'Method', 'Endpoint', 'Purpose'],
    [
      ['1', 'POST', '/chat/create-conversation', 'Start / get conversation'],
      ['2', 'GET', '/chat/conversations', 'Conversation list (+ search)'],
      ['3', 'GET', '/chat/messages/:conversationId', 'Message history'],
      ['4', 'GET', '/chat/messages/:id/around/:msgId', 'Jump to message'],
      ['5', 'POST', '/chat/upload-file', 'Send file/asset (+ reply)'],
      ['6', 'PATCH', '/chat/messages/:messageId', 'Edit message text'],
      ['7', 'POST', '/chat/messages/:messageId/react', 'React to message'],
      ['8', 'GET', '/settings/chat', 'Get reply/reaction toggles'],
      ['9', 'PATCH', '/settings/chat', 'Admin: toggle reply/reaction'],
    ],
    [600, 1200, 4200, 4800]
  ),

  h1('2. Message Shape'),
  p('All history and socket payloads include reply + reaction fields:'),
  ...codeBlock(`{
  "_id": "msgId",
  "conversation": "convId",
  "sender": { "_id": "...", "fullName": "...", "profileImage": "..." },
  "receiver": { "_id": "...", "fullName": "...", "profileImage": "..." },
  "text": "Yes, 3pm works",
  "file": null,
  "asset": null,
  "status": "delivered",
  "isEdited": false,
  "replyTo": { "_id": "...", "text": "...", "sender": { "fullName": "Bob" } },
  "replyToSnapshot": {
    "_id": "...",
    "text": "Can we meet tomorrow?",
    "file": null,
    "senderName": "Bob",
    "senderId": "userB"
  },
  "reactions": [
    { "user": { "_id": "...", "fullName": "Alice" }, "emoji": "👍", "createdAt": "..." }
  ],
  "reactionSummary": { "👍": 1 },
  "createdAt": "...",
  "updatedAt": "..."
}`),
  bullet('replyTo — live populate (may be null if original deleted)'),
  bullet('replyToSnapshot — frozen quote for UI even if original is deleted'),
  bullet('reactionSummary — emoji count map for badges'),

  h1('3. REST APIs'),

  h2('3.1 Create Conversation'),
  label('Request'),
  ...codeBlock('POST {{BASE_URL}}/api/v1/chat/create-conversation'),
  label('Headers'),
  makeTable(
    ['Key', 'Value'],
    [
      ['Authorization', 'Bearer {{accessToken}}'],
      ['Content-Type', 'application/json'],
    ],
    [3600, 7200]
  ),
  label('Body'),
  ...codeBlock(`{ "partnerId": "66f1a2b3c4d5e6f7a8b9c0d1" }`),
  label('Response 201'),
  ...codeBlock(`{
  "success": true,
  "statusCode": 201,
  "message": "Conversation created successfully",
  "data": { "_id": "convId", "participants": [], "lastMessage": null }
}`),

  h2('3.2 Get Conversations'),
  ...codeBlock(
    'GET {{BASE_URL}}/api/v1/chat/conversations?searchTerm=alice&page=1&limit=20&sort=-updatedAt'
  ),
  makeTable(
    ['Query', 'Required', 'Description'],
    [
      ['searchTerm', 'no', 'Search partner by fullName / email'],
      ['page / limit / sort', 'no', 'Pagination & sort'],
    ],
    [2800, 1600, 6400]
  ),

  h2('3.3 Get Message History'),
  ...codeBlock(
    'GET {{BASE_URL}}/api/v1/chat/messages/{{conversationId}}?page=1&limit=20&sort=-createdAt'
  ),
  p('Response includes data (messages), receiver, pagination. Each message has replyTo, replyToSnapshot, reactions, reactionSummary.'),

  h2('3.4 Jump To Message (Around)'),
  ...codeBlock(
    'GET {{BASE_URL}}/api/v1/chat/messages/{{conversationId}}/around/{{messageId}}?before=12&after=12'
  ),
  makeTable(
    ['Query', 'Default', 'Max', 'Description'],
    [
      ['before', '12', '50', 'Messages before target'],
      ['after', '12', '50', 'Messages after target'],
    ],
    [2400, 1800, 1800, 4800]
  ),
  label('Response data'),
  ...codeBlock(`{
  "targetMessageId": "msgId",
  "messages": [ "...before...", "...target...", "...after..." ],
  "hasMoreBefore": true,
  "hasMoreAfter": false
}`),
  p('App tip: scroll to / highlight targetMessageId. Order is oldest → newest.'),

  h2('3.5 Upload File / Reply (REST)'),
  ...codeBlock('POST {{BASE_URL}}/api/v1/chat/upload-file'),
  p('Content-Type: multipart/form-data'),
  makeTable(
    ['Key', 'Type', 'Required', 'Description'],
    [
      ['conversationId', 'Text', 'yes', 'Conversation id'],
      ['chat_file / file', 'File', 'one of', 'Upload file'],
      ['assetUrl', 'Text', 'one of', 'Existing chat asset URL'],
      ['text', 'Text', 'no', 'Caption'],
      ['replyTo', 'Text', 'no', 'Message id to reply to'],
    ],
    [2600, 1600, 1600, 5000]
  ),

  h2('3.6 Edit Message (REST)'),
  ...codeBlock('PATCH {{BASE_URL}}/api/v1/chat/messages/{{messageId}}'),
  ...codeBlock(`{ "text": "Yes, 4pm works instead" }`),
  p('Also emits socket event: message_updated to both participants.'),

  h2('3.7 React To Message (REST)'),
  ...codeBlock('POST {{BASE_URL}}/api/v1/chat/messages/{{messageId}}/react'),
  ...codeBlock(`{ "emoji": "❤️" }`),
  ...codeBlock(`{
  "success": true,
  "message": "Reaction added successfully",
  "data": {
    "action": "added",
    "message": { "...full message with reactions + reactionSummary..." }
  }
}`),
  p('action values: added | replaced | removed'),

  h2('3.8 Get Chat Settings'),
  ...codeBlock('GET {{BASE_URL}}/api/v1/settings/chat'),
  p('Roles: user, admin'),
  ...codeBlock(`{ "success": true, "data": { "reply": true, "reaction": true } }`),

  h2('3.9 Update Chat Setting (Admin Dashboard)'),
  ...codeBlock('PATCH {{BASE_URL}}/api/v1/settings/chat'),
  p('Roles: admin only'),
  ...codeBlock(`{ "feature": "reply", "status": false }`),
  ...codeBlock(`{ "feature": "reaction", "status": true }`),
  makeTable(
    ['When OFF', 'Blocked'],
    [
      ['reply: false', 'replyTo on send_message / upload-file → 403'],
      ['reaction: false', 'REST react + socket react_message → 403'],
    ],
    [3600, 7200]
  ),
  p('Normal text/file messages still work when features are off.'),

  h1('4. Socket.IO Events (Preferred for Live Chat)'),
  p('Connect with the same auth token used for REST.'),

  h2('4.1 Emit: send_message (send + reply)'),
  label('Client emits'),
  ...codeBlock(`socket.emit("send_message", {
  "conversationId": "66f1conv0000000000000001",
  "text": "Yes, 3pm works",
  "replyTo": "66f1msg0000000000000001",
  "file": null,
  "assetId": null
});`),
  bullet('conversationId — required'),
  bullet('text / file / assetId — at least one required'),
  bullet('replyTo — optional; must be a message in same conversation'),
  bullet('If reply feature is OFF and replyTo is sent → message_error'),
  label('Server emits'),
  makeTable(
    ['Event', 'To', 'Meaning'],
    [
      ['message_sent', 'Sender', 'Ack with full message (includes reply fields)'],
      ['new_message', 'Receiver (online)', 'Incoming message'],
      ['message_error', 'Sender', 'Validation / failure'],
      ['conversations', 'Both', 'Conversation list refresh'],
    ],
    [2800, 2800, 5200]
  ),

  h2('4.2 Emit: update_message (edit text)'),
  p('Use this to edit your own message text in real time. Same as REST PATCH.'),
  label('Client emits'),
  ...codeBlock(`socket.emit("update_message", {
  "messageId": "66f1msg0000000000000002",
  "text": "Updated text here"
});`),
  makeTable(
    ['Field', 'Required', 'Rules'],
    [
      ['messageId', 'yes', 'Valid ObjectId; must be your own message'],
      ['text', 'yes', 'Non-empty trimmed string'],
    ],
    [2800, 1800, 6200]
  ),
  label('Server behavior'),
  bullet('Validates messageId and non-empty text'),
  bullet('Only the original sender can update'),
  bullet('Sets isEdited = true'),
  bullet('Emits message_updated to BOTH participants (sender + receiver)'),
  bullet('Refreshes conversations list for both users'),
  label('Listen: message_updated'),
  ...codeBlock(`socket.on("message_updated", (message) => {
  // message = full populated message object
  // Update local list by message._id
  // Show "edited" badge using message.isEdited === true
});`),
  label('Example message_updated payload'),
  ...codeBlock(`{
  "_id": "66f1msg0000000000000002",
  "conversation": "66f1conv0000000000000001",
  "text": "Updated text here",
  "isEdited": true,
  "replyTo": null,
  "replyToSnapshot": null,
  "reactions": [],
  "reactionSummary": {},
  "sender": { "_id": "userA", "fullName": "Alice", "profileImage": "..." },
  "receiver": { "_id": "userB", "fullName": "Bob", "profileImage": "..." },
  "status": "delivered",
  "createdAt": "...",
  "updatedAt": "..."
}`),
  label('Error'),
  ...codeBlock(`socket.on("message_error", (err) => {
  // err.message examples:
  // "Valid messageId is required"
  // "Message text cannot be empty"
  // "You can only update your own messages"
  // "Message not found"
});`),

  h2('4.3 Emit: react_message'),
  label('Client emits'),
  ...codeBlock(`socket.emit("react_message", {
  "messageId": "66f1msg0000000000000002",
  "emoji": "😂"
});`),
  label('Listen: message_reacted (both participants)'),
  ...codeBlock(`socket.on("message_reacted", (payload) => {
  // payload.action = "added" | "replaced" | "removed"
  // payload.message = full message with reactions + reactionSummary
});`),
  ...codeBlock(`{
  "messageId": "66f1msg0000000000000002",
  "conversationId": "66f1conv0000000000000001",
  "action": "added",
  "message": {
    "_id": "66f1msg0000000000000002",
    "reactions": [
      { "user": { "_id": "userA", "fullName": "Alice" }, "emoji": "😂", "createdAt": "..." }
    ],
    "reactionSummary": { "😂": 1 }
  }
}`),

  h2('4.4 Socket event cheat sheet'),
  makeTable(
    ['Direction', 'Event', 'Purpose'],
    [
      ['Client →', 'send_message', 'Send (+ optional replyTo)'],
      ['Client →', 'update_message', 'Edit own message text'],
      ['Client →', 'react_message', 'Toggle / replace reaction'],
      ['Server →', 'message_sent', 'Send acknowledgement'],
      ['Server →', 'new_message', 'Incoming message'],
      ['Server →', 'message_updated', 'Message was edited'],
      ['Server →', 'message_reacted', 'Reaction changed'],
      ['Server →', 'message_error', 'Error { message }'],
      ['Server →', 'conversations', 'Conversation list refresh'],
    ],
    [2200, 3200, 5400]
  ),

  h1('5. App Integration Flows'),
  h3('A) Reply + jump'),
  bullet('On chat open → GET /settings/chat; if reply=false hide reply UI'),
  bullet('Send with replyTo via socket send_message'),
  bullet('Render quote from replyToSnapshot'),
  bullet('On quote tap → GET .../around/:messageId'),
  bullet('Highlight data.targetMessageId'),

  h3('B) Reaction'),
  bullet('If reaction=false hide emoji UI'),
  bullet('Emit react_message or POST /messages/:id/react'),
  bullet('On message_reacted update local reactions + reactionSummary'),

  h3('C) Edit message (socket update)'),
  bullet('User edits bubble → emit update_message'),
  bullet('On message_updated replace message in list by _id'),
  bullet('Show edited indicator when isEdited is true'),

  h3('D) Dashboard toggle'),
  bullet('Admin GET /settings/chat → show switches'),
  bullet('Admin PATCH /settings/chat { feature, status }'),
  bullet('App re-fetches settings on next open'),

  h1('6. Common Errors'),
  makeTable(
    ['Status', 'Meaning'],
    [
      ['400', 'Invalid id / empty text / invalid emoji / replyTo wrong conversation'],
      ['401', 'Missing / invalid token'],
      ['403', 'Not participant / not owner / blocked / feature disabled'],
      ['404', 'Conversation / message not found'],
    ],
    [1800, 9000]
  ),
  p('Feature-disabled messages:'),
  bullet('Message reply is currently disabled'),
  bullet('Message reaction is currently disabled'),

  h1('7. Postman Variables'),
  makeTable(
    ['Variable', 'Example'],
    [
      ['BASE_URL', 'http://localhost:5000'],
      ['accessToken', 'eyJhbGciOi...'],
      ['adminToken', 'eyJhbGciOi... (admin role)'],
      ['conversationId', '66f1conv...'],
      ['messageId', '66f1msg...'],
      ['partnerId', '66f1user...'],
    ],
    [3600, 7200]
  ),

  new Paragraph({
    spacing: { before: 400 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: 'Upload this .docx to Google Drive → Open with Google Docs to share/edit.',
        font: 'Calibri',
        size: 18,
        italics: true,
        color: '666666',
      }),
    ],
  }),
];

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: 15840 },
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        },
      },
      children,
    },
  ],
});

const outPath = path.join(__dirname, 'Chirine-Chat-API-Documentation.docx');

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log('Created:', outPath);
});
