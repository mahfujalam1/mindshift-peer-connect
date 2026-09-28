type ReportStatusEmailOptions = {
  name?: string;
  reportTitle: string;
  status: 'Resolved' | 'Rejected';
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

const reportStatusEmailBody = ({ name, reportTitle, status }: ReportStatusEmailOptions) => {
  const statusColor = status === 'Resolved' ? '#166534' : '#9f1239';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report ${status}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f7f9fc;font-family:Arial,Helvetica,sans-serif;color:#333333;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;">
          <tr><td style="padding:24px;background-color:#6c63ff;color:#ffffff;text-align:center;">
            <h1 style="margin:0;font-size:24px;">MindShift Peer Connect</h1>
          </td></tr>
          <tr><td style="padding:32px;line-height:1.6;">
            <h2 style="margin:0 0 20px;font-size:22px;">Report status update</h2>
            <p>Hello ${escapeHtml(name || 'there')},</p>
            <p>Your report <strong>${escapeHtml(reportTitle)}</strong> has been reviewed.</p>
            <p>Status: <strong style="color:${statusColor};">${status}</strong></p>
            <p>Thank you for bringing this to our attention.</p>
          </td></tr>
          <tr><td style="padding:20px;background-color:#f7f9fc;color:#666666;text-align:center;font-size:12px;">
            &copy; ${new Date().getFullYear()} MindShift Peer Connect. All rights reserved.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
};

export default reportStatusEmailBody;
