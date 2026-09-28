# Report status email and notifications

Existing admin endpoints now notify the **reporter** when status changes:

- `PATCH /api/v1/report/resolve/:id` sets `Resolved` and `isResolved: true`.
- `PATCH /api/v1/report/reject/:id` sets `Rejected` and `isResolved: false`.

The reported user does not receive these messages. Request and response formats are unchanged.

The reporter receives an email with subject `Report Resolved` or `Report Rejected`, the report title and the resulting status. Reporter name and report title are escaped in HTML. No evidence image or report description is embedded in the email.

The existing notification helper saves an in-app notification with `type: 'report'`, emits the user's notification count through the `notifications` socket event and attempts OneSignal push delivery. Push requires valid OneSignal configuration and a registered subscription. Email uses existing SMTP configuration.

Push data:

```json
{ "type": "report", "reportId": "REPORT_ID", "status": "Resolved" }
```

The notification database stores the existing title/message/type fields; `reportId` and `status` are push metadata, not new persisted notification fields. Frontend code should handle the new `report` notification type. Report detail endpoints remain admin-only, so a reporter's push should not navigate directly to an admin-only report detail API.

Repeated requests for the same current status return the report without sending another email/notification. Changing to a different status sends another update. Status transitions use a conditional database update to suppress duplicate deliveries from concurrent identical requests.

Delivery uses the existing best-effort helpers. Status changes remain saved if email/notification delivery fails. Failures are logged; no retry queue or delivery guarantee is introduced. Repeating the same status does not retry a failed delivery. In the existing notification helper, socket failures can prevent the push step after saving the in-app notification.

Verification:

```sh
npm run build -- --noEmit
node --test tests/report-status-notifications.test.cjs
```

Tests mock the database and delivery helpers; no real emails or pushes are sent.
