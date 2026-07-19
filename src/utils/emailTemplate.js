const buildEmail = ({ heading, greeting, body, footerNote }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
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
            <td style="padding:0 40px 8px 40px;text-align:center;">
              <h2 style="margin:0;font-size:20px;color:#FFFFFF;font-weight:600;">
                ${heading}
              </h2>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 40px 24px 40px;color:#CBD5E1;font-size:15px;line-height:1.7;">
              <p style="margin:0 0 16px;">${greeting}</p>
              ${body}
              ${footerNote ? `<p style="margin:24px 0 0;font-size:13px;color:#64748B;">${footerNote}</p>` : ''}
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
};

module.exports = { buildEmail };
