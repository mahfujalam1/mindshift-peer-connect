const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const output = {};
  vm.runInNewContext(compiled, {
    exports: output, URL, ...globals,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return output;
}

function uploader() {
  let options;
  let field;
  const multer = (config) => {
    options = config;
    return { single: (name) => { field = name; } };
  };
  const helper = load('src/app/helper/multer-s3-uploader.ts', {
    '@aws-sdk/client-s3': { S3Client: class {} },
    dotenv: { config() {} },
    multer,
    'multer-s3': () => ({ storage: 's3' }),
  }, { process: { env: { AWS_REGION: 'test-region', AWS_S3_BUCKET_NAME: 'test-bucket' } } });
  helper.uploadReportImage();
  return { helper, options, field };
}

test('report upload uses S3, one image field and a 10 MB limit', () => {
  const { options, field } = uploader();
  assert.equal(options.storage.storage, 's3');
  assert.equal(field, 'image');
  assert.equal(options.limits.files, 1);
  assert.equal(options.limits.fileSize, 10 * 1024 * 1024);
});

test('report upload accepts supported images and rejects other MIME types', () => {
  const { options } = uploader();
  for (const mimetype of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
    options.fileFilter({}, { mimetype }, (error, accepted) => {
      assert.equal(error, null);
      assert.equal(accepted, true);
    });
  }
  for (const mimetype of ['application/pdf', 'video/mp4', 'image/svg+xml', 'text/plain']) {
    options.fileFilter({}, { mimetype }, (error) => assert.ok(error));
  }
});

test('uploaded image URL comes from S3 metadata; missing image is supported', () => {
  const { helper } = uploader();
  assert.equal(helper.getUploadedFileUrl({ key: 'uploads/images/assets/evidence.png' }),
    'https://test-bucket.s3.test-region.amazonaws.com/uploads/images/assets/evidence.png');
  assert.equal(helper.getUploadedFileUrl(undefined), undefined);
});

for (const attached of [true, false]) {
  test(`report controller persists ${attached ? 'uploaded URL' : 'null without an image'}`, async () => {
    let persisted;
    let response;
    const { helper } = uploader();
    const { ReportControllers } = load('src/app/modules/report/report.controller.ts', {
      'http-status': require('http-status'),
      '../../utilities/catchAsync': (handler) => handler,
      '../../utilities/sendResponse': (_res, body) => { response = body; },
      '../../helper/multer-s3-uploader': helper,
      './report.service': { ReportServices: {
        createReportIntoDB: async (reporter, payload) => {
          persisted = { reporter, ...payload };
          return persisted;
        },
      } },
    });
    await ReportControllers.createReport({
      user: { id: 'authenticated-user' },
      body: { reportedUser: 'reported-user', title: 'Report', description: 'Details', reportType: 'Spam', image: 'untrusted-client-url' },
      file: attached ? { key: 'uploads/images/assets/evidence.png' } : undefined,
    }, {});
    assert.equal(persisted.reporter, 'authenticated-user');
    assert.equal(persisted.title, 'Report');
    assert.equal(persisted.image, attached
      ? 'https://test-bucket.s3.test-region.amazonaws.com/uploads/images/assets/evidence.png' : null);
    assert.equal(response.statusCode, 201);
    assert.equal(response.data.image, persisted.image);
  });
}

test('report model retains image URLs and defaults image to null', () => {
  const { Report } = load('src/app/modules/report/report.model.ts', { mongoose: require('mongoose') });
  assert.equal(new Report().image, null);
  const report = new Report({ image: 'https://example.com/evidence.png' });
  assert.equal(report.toObject().image, 'https://example.com/evidence.png');
});
