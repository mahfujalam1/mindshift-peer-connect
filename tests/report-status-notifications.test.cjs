const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const templateSource = fs.readFileSync(path.join(__dirname, '../src/app/mailTemplate/reportStatusEmailBody.ts'), 'utf8');
const templateExports = {};
vm.runInNewContext(ts.transpileModule(templateSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: templateExports });

function fixture() {
  const state = {
    report: { _id: 'report-id', reporter: 'reporter-id', reportedUser: 'other-user', title: '<script>Evidence</script>', status: 'Pending' },
    user: { email: 'reporter@example.com', fullName: '<Reporter>' },
    emails: [], notifications: [], errors: [],
  };
  class AppError extends Error {
    constructor(statusCode, message) { super(message); this.statusCode = statusCode; }
  }
  const dependencies = {
    '../../mailTemplate/reportStatusEmailBody': templateExports.default,
    'http-status': require('http-status'),
    '../../error/appError': AppError,
    '../../builder/QueryBuilder': class {},
    './report.model': { Report: {
      findOneAndUpdate: async (filter, update) => {
        if (!state.report || state.report.status === filter.status.$ne) return null;
        Object.assign(state.report, update.$set);
        return { ...state.report };
      },
      findById: async () => state.report,
    } },
    '../user/user-model': { findById: (id) => {
      assert.equal(id, 'reporter-id');
      return { select: () => ({ lean: async () => state.user }) };
    } },
    '../../utilities/sendEmail': async (options) => {
      state.emails.push(options);
      if (state.failEmail) throw new Error('SMTP unavailable');
    },
    '../../helper/notificationHelper': { sendNotification: async (...args) => {
      state.notifications.push(args);
      if (state.failNotification) throw new Error('Notification unavailable');
    } },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/app/modules/report/report.service.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const output = {};
  vm.runInNewContext(compiled, {
    exports: output,
    console: { error: (...args) => state.errors.push(args) },
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return { state, service: output.ReportServices };
}

for (const [method, status] of [['resolveReportInDB', 'Resolved'], ['rejectReportInDB', 'Rejected']]) {
  test(`${status} sends one email and notification to the reporter, escaping HTML`, async () => {
    const { state, service } = fixture();
    const result = await service[method]('report-id');
    assert.equal(result.status, status);
    assert.equal(result.isResolved, status === 'Resolved');
    assert.equal(state.emails.length, 1);
    assert.equal(state.emails[0].email, 'reporter@example.com');
    assert.ok(state.emails[0].html.includes('&lt;Reporter&gt;'));
    assert.ok(!state.emails[0].html.includes('<script>'));
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0][0], 'reporter-id');
    assert.equal(state.notifications[0][3].type, 'report');
    assert.equal(state.notifications[0][3].reportId, 'report-id');
    assert.equal(state.notifications[0][3].status, status);
  });

  test(`${status} concurrent/repeated requests do not duplicate deliveries`, async () => {
    const { state, service } = fixture();
    await Promise.all([service[method]('report-id'), service[method]('report-id')]);
    await service[method]('report-id');
    assert.equal(state.emails.length, 1);
    assert.equal(state.notifications.length, 1);
  });
}

test('a later status change sends a new update', async () => {
  const { state, service } = fixture();
  await service.resolveReportInDB('report-id');
  await service.rejectReportInDB('report-id');
  assert.equal(state.emails.length, 2);
  assert.equal(state.notifications[1][3].status, 'Rejected');
});

test('missing report returns 404 without deliveries', async () => {
  const { state, service } = fixture();
  state.report = null;
  await assert.rejects(service.resolveReportInDB('report-id'), { statusCode: 404 });
  assert.equal(state.emails.length + state.notifications.length, 0);
});

for (const failure of ['failEmail', 'failNotification']) {
  test(`${failure} does not block the other channel or undo the status`, async () => {
    const { state, service } = fixture();
    state[failure] = true;
    const result = await service.resolveReportInDB('report-id');
    assert.equal(result.status, 'Resolved');
    assert.equal(state.emails.length, 1);
    assert.equal(state.notifications.length, 1);
    assert.equal(state.errors.length, 1);
  });
}

test('missing reporter email skips email but still attempts notification', async () => {
  const { state, service } = fixture();
  state.user = null;
  await service.rejectReportInDB('report-id');
  assert.equal(state.emails.length, 0);
  assert.equal(state.notifications.length, 1);
});
