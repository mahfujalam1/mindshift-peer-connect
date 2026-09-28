const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { Types } = require('mongoose');

// Isolate service behavior from MongoDB, uploads and the live socket server.
function fixture() {
  const userId = new Types.ObjectId().toString();
  const roomId = new Types.ObjectId();
  const messageId = new Types.ObjectId();
  const original = { _id: messageId, room: roomId, sender: userId, text: 'Before', file: 'photo.png', reactions: [] };
  const state = {
    message: original,
    room: { members: [userId], lastMessage: messageId },
    latest: { _id: new Types.ObjectId() },
    events: [], calls: [],
  };
  const LiveMessage = {
    findById: async () => state.message,
    findOneAndUpdate: (filter, update, options) => ({ populate: async () => {
      state.calls.push({ operation: 'edit', filter, update, options });
      return state.message ? { ...state.message, ...update.$set } : null;
    } }),
    findOneAndDelete: async (filter) => {
      state.calls.push({ operation: 'delete', filter });
      return state.message;
    },
    updateMany: async (filter, update) => state.calls.push({ operation: 'replies', filter, update }),
    findOne: () => ({ sort: () => ({ select: async () => state.latest }) }),
  };
  const LiveDiscussion = {
    findById: async () => state.room,
    updateOne: async (filter, update) => {
      state.calls.push({ operation: 'preview', filter, update });
      if (String(state.room.lastMessage) === String(filter.lastMessage)) {
        state.room.lastMessage = update.$set.lastMessage;
      }
    },
  };
  class AppError extends Error {
    constructor(statusCode, message) { super(message); this.statusCode = statusCode; }
  }
  const dependencies = {
    'http-status': require('http-status'),
    mongoose: { Types },
    '../../error/appError': AppError,
    '../../helper/multer-s3-uploader': { getPublicFileUrl: (value) => value },
    '../follow/follow.model': {},
    '../chat/chat-setting.model': {},
    './live-discussion.constants': { LIVE_MESSAGE_POPULATE: [] },
    './live-discussion.model': { LiveMessage, LiveDiscussion },
    '../../socket/socket': {
      getIO: () => ({ to: (room) => ({ emit: (event, payload) => state.events.push({ room, event, payload }) }) }),
      emitUpdatedLiveRoomLists: async (members) => { state.refreshedMembers = members; },
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/app/modules/live-discussion/live-discussion.service.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const output = {};
  vm.runInNewContext(compiled, {
    exports: output, console,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return { state, userId, messageId: String(messageId), service: output.LiveDiscussionServices };
}

for (const method of ['updateLiveMessage', 'deleteLiveMessage']) {
  for (const scenario of ['invalid id', 'missing message', 'missing room', 'non-member', 'different sender']) {
    test(`${method} rejects ${scenario}`, async () => {
      const f = fixture();
      let id = f.messageId;
      let status = 403;
      if (scenario === 'invalid id') { id = 'bad'; status = 400; }
      if (scenario === 'missing message') { f.state.message = null; status = 404; }
      if (scenario === 'missing room') { f.state.room = null; status = 404; }
      if (scenario === 'non-member') f.state.room.members = [];
      if (scenario === 'different sender') f.state.message.sender = new Types.ObjectId();
      await assert.rejects(f.service[method](f.userId, id, 'Updated'), { statusCode: status });
      assert.equal(f.state.calls.length, 0);
      assert.equal(f.state.events.length, 0);
    });
  }
}

test('edit trims text, preserves attachments/reactions and broadcasts to the room', async () => {
  const f = fixture();
  f.state.message.reactions = [{ user: f.userId, emoji: '🦊' }];
  const result = await f.service.updateLiveMessage(f.userId, f.messageId, '  After  ');
  assert.equal(result.message.text, 'After');
  assert.equal(result.message.isEdited, true);
  assert.equal(result.message.file, 'photo.png');
  assert.equal(result.message.reactionSummary['🦊'], 1);
  assert.equal(f.state.calls[0].filter.sender, f.userId);
  assert.deepEqual(Object.keys(f.state.calls[0].update.$set).sort(), ['isEdited', 'text']);
  assert.equal(f.state.events[0].event, 'live_message_updated');
  assert.equal(f.state.events[0].room, result.roomId);
  assert.equal(f.state.refreshedMembers[0], f.userId);
});

test('edit rejects blank and non-string text', async () => {
  const f = fixture();
  for (const text of ['', '  ', null, undefined, 42, {}]) {
    await assert.rejects(f.service.updateLiveMessage(f.userId, f.messageId, text), { statusCode: 400 });
  }
  assert.equal(f.state.calls.length, 0);
});

for (const remaining of [true, false]) {
  test(`delete clears reply copies and sets preview to ${remaining ? 'previous message' : 'null'}`, async () => {
    const f = fixture();
    if (!remaining) f.state.latest = null;
    const result = await f.service.deleteLiveMessage(f.userId, f.messageId);
    assert.equal(result.messageId, f.messageId);
    assert.equal(f.state.calls[0].filter.sender, f.userId);
    const cleanup = f.state.calls.find((call) => call.operation === 'replies');
    assert.equal(cleanup.update.$set.replyTo, null);
    assert.equal(cleanup.update.$set.replyToSnapshot, null);
    assert.equal(String(f.state.room.lastMessage), String(f.state.latest?._id || null));
    assert.equal(f.state.events[0].event, 'live_message_deleted');
  });
}

test('delete does not overwrite a newer last-message pointer', async () => {
  const f = fixture();
  const newer = new Types.ObjectId();
  f.state.room.lastMessage = newer;
  await f.service.deleteLiveMessage(f.userId, f.messageId);
  assert.equal(f.state.room.lastMessage, newer);
});
