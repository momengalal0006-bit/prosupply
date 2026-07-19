const transporter = require('../config/email');

const sendPasswordResetEmail = async (to, fullName, otp) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#0B1121;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B1121;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0"
          style="background-color:#151E32;border:1px solid #2A3B5C;border-radius:12px;overflow:hidden;">

          <tr>
            <td style="padding:32px 40px 16px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;color:#00E5FF;font-weight:700;">
                ⚙️ ProSupply
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 40px 24px 40px;color:#CBD5E1;font-size:15px;line-height:1.7;">
              <p style="margin:0 0 16px;">Hi <strong style="color:#FFFFFF;">${fullName}</strong>,</p>
              <p style="margin:0 0 24px;">
                You requested a password reset for your ProSupply account.
                Use the code below to complete the process:
              </p>

              <div style="text-align:center;margin:0 0 24px;">
                <div style="display:inline-block;background-color:#0B1121;border:2px solid #00E5FF;border-radius:10px;padding:18px 36px;">
                  <span style="font-size:2.5rem;font-weight:700;letter-spacing:0.3em;color:#00E5FF;font-family:'Courier New',monospace;">
                    ${otp}
                  </span>
                </div>
              </div>

              <p style="margin:0 0 8px;color:#F59E0B;font-size:14px;font-weight:600;">
                ⚠️ This code expires in 15 minutes.
              </p>

              <p style="margin:24px 0 0;font-size:13px;color:#64748B;">
                If you didn't request this, you can safely ignore this email.
                Your account remains secure.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px;border-top:1px solid #2A3B5C;text-align:center;">
              <p style="margin:0;font-size:12px;color:#475569;">
                &copy; ${new Date().getFullYear()} ProSupply. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Your ProSupply Password Reset Code',
    html,
  });
};

module.exports = { sendPasswordResetEmail };
