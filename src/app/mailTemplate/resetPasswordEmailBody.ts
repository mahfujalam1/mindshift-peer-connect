const resetPasswordEmailBody = (name: string, resetCode: number) => {
  const cleanName = (name || '').trim();
  const displayName =
    cleanName && cleanName.toLowerCase() !== 'hello' ? `, ${cleanName}` : '';

  return `
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f7f9fc;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .header {
          background-color: #00ACA7;
          padding: 24px 20px;
          color: #ffffff;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
          color: #ffffff;
        }
        .content {
          padding: 32px 28px;
          color: #333333;
        }
        .content h2 {
          font-size: 20px;
          color: #222222;
          margin-top: 0;
          margin-bottom: 18px;
          font-weight: 600;
        }
        .content p {
          font-size: 15px;
          color: #555555;
          line-height: 1.6;
          margin-bottom: 18px;
        }
        .reset-box {
          background-color: #f0fbfb;
          border: 1px dashed #00ACA7;
          border-radius: 8px;
          padding: 18px;
          text-align: center;
          margin: 24px 0;
        }
        .reset-code {
          font-size: 32px;
          color: #00ACA7;
          font-weight: 700;
          letter-spacing: 4px;
        }
        .footer {
          padding: 20px;
          font-size: 13px;
          color: #888888;
          text-align: center;
          background-color: #f7f9fc;
          border-top: 1px solid #eeeeee;
        }
        .footer p {
          margin: 4px 0;
        }
        a {
          color: #00ACA7;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello${displayName}</h2>

          <p>We received a request to reset your password. Please use the code below to proceed with resetting your password:</p>
          <div class="reset-box">
            <div class="reset-code">${resetCode || 'XXXXXX'}</div>
          </div>
          <p>Enter this code on the password reset screen within the next 10 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
          <p>If you have any questions, feel free to contact us at <a href="mailto:support@themindshiftproject.ca">support@themindshiftproject.ca</a>.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} MindShift Peer Connect. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
`;
};

export default resetPasswordEmailBody;
