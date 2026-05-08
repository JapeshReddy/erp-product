function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

interface BuildEmailParams {
  adminName: string;
  userName: string;
  userEmail: string;
  organizationName: string;
  clientId: string;
  requestedAt: string;
  availableRoles: string[];
  appUrl: string;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function buildAdminEmail(params: BuildEmailParams): EmailContent {
  const safeName = sanitizeHtml(params.userName);
  const safeEmail = sanitizeHtml(params.userEmail);
  const safeOrg = sanitizeHtml(params.organizationName);
  const safeAdmin = sanitizeHtml(params.adminName);
  const reviewUrl = `${params.appUrl}/admin/access-requests`;

  const rolesHtml = params.availableRoles
    .map(
      (r) => `<li style="margin:4px 0;font-size:13px;color:#374151;">
                 ${sanitizeHtml(r)}
               </li>`,
    )
    .join("");

  const subject = `Action Required: New Access Request — ${safeName} (${safeOrg})`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>New Access Request</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;
             font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0"
    border="0" width="100%"
    style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0"
        border="0" style="max-width:580px;width:100%;margin:0 auto;">

        <!-- Accent bar -->
        <tr>
          <td style="background:linear-gradient(90deg,#0B3D91,#1E5DB8,#3b82f6);
                      height:4px;border-radius:8px 8px 0 0;
                      font-size:0;">&nbsp;</td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#fff;border-radius:0 0 8px 8px;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);
                      padding:36px 40px;">

            <!-- Logo -->
            <table role="presentation" cellspacing="0" cellpadding="0"
              border="0" width="100%">
              <tr>
                <td style="padding-bottom:24px;border-bottom:1px solid #f1f5f9;">
                  <img
  src="https://trlyvlnziepzjqoabtve.supabase.co/storage/v1/object/public/branding/email_logo.png"
  alt="Varun ERP Solutions" width="220"
  style="display:block;height:auto;border:0;max-width:220px;"/>
                </td>
              </tr>
            </table>

            <!-- Title -->
            <table role="presentation" cellspacing="0" cellpadding="0"
              border="0" width="100%">
              <tr>
                <td style="padding:24px 0 16px 0;">
                  <h1 style="margin:0;font-size:20px;font-weight:700;color:#0f172a;">
                    New Access Request
                  </h1>
                  <p style="margin:8px 0 0 0;font-size:14px;
                             color:#475569;line-height:1.6;">
                    Hi ${safeAdmin}, a new user has verified their email
                    and is requesting access to
                    <strong style="color:#0B3D91;">${safeOrg}</strong>.
                  </p>
                </td>
              </tr>
            </table>

            <!-- User details -->
            <table role="presentation" cellspacing="0" cellpadding="0"
              border="0" width="100%">
              <tr>
                <td style="background:#f8fafc;border-radius:8px;
                            border-left:3px solid #0B3D91;
                            padding:16px 20px;">
                  <p style="margin:0 0 6px 0;font-size:13px;color:#64748b;">
                    <strong style="color:#374151;">Full Name:</strong>
                    &nbsp;${safeName}
                  </p>
                  <p style="margin:0 0 6px 0;font-size:13px;color:#64748b;">
                    <strong style="color:#374151;">Email:</strong>
                    &nbsp;${safeEmail}
                  </p>
                  <p style="margin:0 0 6px 0;font-size:13px;color:#64748b;">
                    <strong style="color:#374151;">Organization:</strong>
                    &nbsp;${safeOrg}
                  </p>
                  <p style="margin:0;font-size:13px;color:#64748b;">
                    <strong style="color:#374151;">Requested At:</strong>
                    &nbsp;${params.requestedAt}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Roles -->
            <table role="presentation" cellspacing="0" cellpadding="0"
              border="0" width="100%">
              <tr>
                <td style="padding:16px 0 8px 0;">
                  <p style="margin:0 0 8px 0;font-size:13px;
                             font-weight:700;color:#374151;">
                    Available Roles to Assign:
                  </p>
                  <ul style="margin:0;padding-left:20px;">
                    ${rolesHtml}
                  </ul>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table role="presentation" cellspacing="0" cellpadding="0"
              border="0" width="100%">
              <tr>
                <td align="center" style="padding:24px 0;">
                  <a href="${reviewUrl}"
                    style="display:inline-block;background:#0B3D91;
                            color:#fff;font-family:Arial,sans-serif;
                            font-size:14px;font-weight:700;
                            text-decoration:none;border-radius:6px;
                            padding:12px 32px;
                            box-shadow:0 2px 8px rgba(11,61,145,0.3);">
                    Review Request
                  </a>
                </td>
              </tr>
            </table>

            <!-- Instructions -->
            <table role="presentation" cellspacing="0" cellpadding="0"
              border="0" width="100%">
              <tr>
                <td style="border-top:1px solid #e2e8f0;padding-top:20px;">
                  <p style="margin:0 0 6px 0;font-size:13px;
                             color:#64748b;line-height:1.6;">
                    <strong style="color:#374151;">To Approve:</strong>
                    Log in to the admin dashboard, go to Access Requests,
                    and click Approve.
                  </p>
                  <p style="margin:0;font-size:13px;
                             color:#64748b;line-height:1.6;">
                    <strong style="color:#374151;">To Reject:</strong>
                    Log in to the admin dashboard, go to Access Requests,
                    and click Reject.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:20px 0 0 0;">
            <p style="margin:0 0 4px 0;font-size:12px;color:#94a3b8;">
              This is an automated message — please do not reply.
            </p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;">
              © 2025 Varun ERP Solutions · All rights reserved
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `
New Access Request — ${params.organizationName}

Hi ${params.adminName},

A new user has verified their email and is requesting access.

Name: ${params.userName}
Email: ${params.userEmail}
Organization: ${params.organizationName}
Requested At: ${params.requestedAt}

Available Roles: ${params.availableRoles.join(", ")}

Review here: ${reviewUrl}

© 2025 Varun ERP Solutions
  `.trim();

  return { subject, html, text };
}
