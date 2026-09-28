# Report a user with an optional image

`POST /api/v1/report`

Authentication: `Authorization: Bearer <accessToken>`.

For an image attachment, send `multipart/form-data`:

| Field | Type | Required |
| --- | --- | --- |
| `reportedUser` | Text: reported user's ID | Yes |
| `reportType` | Text | Yes |
| `title` | Text | Yes |
| `description` | Text | Yes |
| `image` | File: JPEG, PNG, WebP or GIF | No |

One image is allowed, up to 10 MB. The existing S3 uploader stores it under `uploads/images/assets/`. The report stores its URL in `image`, using CloudFront when configured, otherwise the configured S3 bucket URL. Existing AWS configuration is reused.

```js
const form = new FormData();
form.append('reportedUser', reportedUserId);
form.append('reportType', 'Harassment');
form.append('title', 'Inappropriate messages');
form.append('description', 'Details of the incident');
if (selectedImage) form.append('image', selectedImage);

const response = await fetch(`${baseUrl}/api/v1/report`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  body: form
});
const result = await response.json();
```

Do not manually set `Content-Type` for browser FormData; the browser supplies the multipart boundary.

Alternatively, put the text fields in a JSON string field named `data`, alongside the `image` file. Do not mix direct text fields with `data` because parsed `data` replaces the text body.

Without an attachment, the existing `application/json` request with the four required text fields still works. New reports without an uploaded file return `image: null`. Sending an image URL as a text field does not attach it; use the file field.

The create response is HTTP 201. Its `data` contains the report including `image`. Admin report list/detail responses also include the stored `image` field, unless the list query explicitly projects it out. Older reports may have no image field; handle missing/null values.

Upload occurs before report validation/database creation, following the existing S3 middleware pattern. A later validation/database error may leave an uploaded object in S3; report deletion does not delete the stored object. Existing bucket/CloudFront access settings determine who can open the URL.

Verification: `npm run build -- --noEmit` and `node --test tests/report-image-upload.test.cjs`. These checks do not perform a real S3 upload.
