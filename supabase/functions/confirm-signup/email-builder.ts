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
  requestId?: string;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function buildAdminEmail(params: BuildEmailParams): EmailContent {
  const safeName    = sanitizeHtml(params.userName);
  const safeEmail   = sanitizeHtml(params.userEmail);
  const safeOrg     = sanitizeHtml(params.organizationName);
  const safeAdmin   = sanitizeHtml(params.adminName);
  const reviewUrl = params.requestId
  ? `${params.appUrl}/admin/access-requests/${params.requestId}`
  : `${params.appUrl}/admin/access-requests`;
  const requestId   = sanitizeHtml(params.requestId ?? params.clientId);

  const subject = `Access Approval Required: ${safeName} is requesting access to ${safeOrg}`;

  const html = `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>Access Approval Required</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;
             font-family:Arial,Helvetica,sans-serif;
             -webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;
              font-size:1px;color:#f1f5f9;line-height:1px;">
    Action required: ${safeName} is requesting access to ${safeOrg} &nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌
  </div>

  <!-- Outer wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0"
    border="0" width="100%"
    style="background-color:#f1f5f9;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Email card -->
        <table role="presentation" cellspacing="0" cellpadding="0"
          border="0" width="100%"
          style="max-width:580px;margin:0 auto;">

          <!-- Top accent bar -->
          <tr>
            <td style="background-color:#0B3D91;height:4px;
                        border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Card body -->
          <tr>
            <td style="background-color:#ffffff;
                        border-radius:0 0 8px 8px;
                        border:1px solid #e2e8f0;
                        border-top:none;
                        overflow:hidden;">

              <table role="presentation" cellspacing="0" cellpadding="0"
                border="0" width="100%">

                <!-- ── HEADER ── -->
                <tr>
                  <td style="padding:28px 36px 24px 36px;
                              border-bottom:1px solid #f1f5f9;">
                    <table role="presentation" cellspacing="0" cellpadding="0"
                      border="0" width="100%">
                      <tr>
                        <!-- Logo -->
                        <td style="vertical-align:middle;">
                          <img
                            src="https://trlyvlnziepzjqoabtve.supabase.co/storage/v1/object/public/branding/email_logo.png"
                            alt="Varun ERP Solutions"
                            width="180"
                            style="display:block;height:auto;border:0;max-width:180px;"/>
                        </td>
                        <!-- IAM label -->
                        <td style="vertical-align:middle;text-align:right;">
                          <span style="font-family:Arial,Helvetica,sans-serif;
                                        font-size:11px;font-weight:700;
                                        color:#64748b;letter-spacing:0.08em;
                                        text-transform:uppercase;">
                            Identity &amp; Access Management
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ── ALERT BADGE ── -->
                <tr>
                  <td style="padding:28px 36px 0 36px;">
                    <table role="presentation" cellspacing="0" cellpadding="0"
                      border="0">
                      <tr>
                        <td style="background-color:#fff7ed;
                                    border:1px solid #fed7aa;
                                    border-radius:4px;
                                    padding:6px 12px;">
                          <span style="font-family:Arial,Helvetica,sans-serif;
                                        font-size:12px;font-weight:700;
                                        color:#c2410c;letter-spacing:0.04em;">
                            ● ACTION REQUIRED
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ── TITLE ── -->
                <tr>
                  <td style="padding:16px 36px 8px 36px;">
                    <h1 style="margin:0 0 8px 0;
                                font-family:Arial,Helvetica,sans-serif;
                                font-size:22px;font-weight:700;
                                color:#0f172a;letter-spacing:-0.3px;
                                line-height:1.3;">
                      Access Approval Required
                    </h1>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;
                               font-size:14px;color:#475569;line-height:1.7;">
                      Hi ${safeAdmin}, a verified user is requesting access
                      to your organization environment. Please review and
                      take action at your earliest convenience.
                    </p>
                  </td>
                </tr>

                <!-- ── DIVIDER ── -->
                <tr>
                  <td style="padding:20px 36px 0 36px;">
                    <table role="presentation" cellspacing="0" cellpadding="0"
                      border="0" width="100%">
                      <tr>
                        <td style="border-top:1px solid #e2e8f0;
                                    font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ── USER DETAILS CARD ── -->
                <tr>
                  <td style="padding:20px 36px 0 36px;">
                    <p style="margin:0 0 10px 0;
                               font-family:Arial,Helvetica,sans-serif;
                               font-size:11px;font-weight:700;
                               color:#94a3b8;letter-spacing:0.08em;
                               text-transform:uppercase;">
                      Requestor Details
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0"
                      border="0" width="100%"
                      style="background-color:#f8fafc;
                              border:1px solid #e2e8f0;
                              border-radius:6px;">
                      <tr>
                        <td style="padding:20px 24px;">

                          <!-- Full Name -->
                          <table role="presentation" cellspacing="0"
                            cellpadding="0" border="0" width="100%"
                            style="margin-bottom:14px;">
                            <tr>
                              <td width="140" style="vertical-align:top;">
                                <span style="font-family:Arial,Helvetica,sans-serif;
                                              font-size:12px;font-weight:700;
                                              color:#64748b;letter-spacing:0.02em;">
                                  Full Name
                                </span>
                              </td>
                              <td style="vertical-align:top;">
                                <span style="font-family:Arial,Helvetica,sans-serif;
                                              font-size:13px;color:#0f172a;
                                              font-weight:600;">
                                  ${safeName}
                                </span>
                              </td>
                            </tr>
                          </table>

                          <!-- Email -->
                          <table role="presentation" cellspacing="0"
                            cellpadding="0" border="0" width="100%"
                            style="margin-bottom:14px;">
                            <tr>
                              <td width="140" style="vertical-align:top;">
                                <span style="font-family:Arial,Helvetica,sans-serif;
                                              font-size:12px;font-weight:700;
                                              color:#64748b;letter-spacing:0.02em;">
                                  Email Address
                                </span>
                              </td>
                              <td style="vertical-align:top;">
                                <span style="font-family:Arial,Helvetica,sans-serif;
                                              font-size:13px;color:#0f172a;">
                                  ${safeEmail}
                                </span>
                              </td>
                            </tr>
                          </table>

                          <!-- Organization -->
                          <table role="presentation" cellspacing="0"
                            cellpadding="0" border="0" width="100%"
                            style="margin-bottom:14px;">
                            <tr>
                              <td width="140" style="vertical-align:top;">
                                <span style="font-family:Arial,Helvetica,sans-serif;
                                              font-size:12px;font-weight:700;
                                              color:#64748b;letter-spacing:0.02em;">
                                  Organization
                                </span>
                              </td>
                              <td style="vertical-align:top;">
                                <span style="font-family:Arial,Helvetica,sans-serif;
                                              font-size:13px;color:#0B3D91;
                                              font-weight:700;">
                                  ${safeOrg}
                                </span>
                              </td>
                            </tr>
                          </table>

                          <!-- Requested At -->
                          <table role="presentation" cellspacing="0"
                            cellpadding="0" border="0" width="100%"
                            style="margin-bottom:14px;">
                            <tr>
                              <td width="140" style="vertical-align:top;">
                                <span style="font-family:Arial,Helvetica,sans-serif;
                                              font-size:12px;font-weight:700;
                                              color:#64748b;letter-spacing:0.02em;">
                                  Requested At
                                </span>
                              </td>
                              <td style="vertical-align:top;">
                                <span style="font-family:Arial,Helvetica,sans-serif;
                                              font-size:13px;color:#0f172a;">
                                  ${params.requestedAt}
                                </span>
                              </td>
                            </tr>
                          </table>

                          <!-- Request ID -->
                          <table role="presentation" cellspacing="0"
                            cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="140" style="vertical-align:top;">
                                <span style="font-family:Arial,Helvetica,sans-serif;
                                              font-size:12px;font-weight:700;
                                              color:#64748b;letter-spacing:0.02em;">
                                  Request ID
                                </span>
                              </td>
                              <td style="vertical-align:top;">
                                <span style="font-family:Arial,Helvetica,sans-serif;
                                              font-size:12px;color:#64748b;
                                              font-family:monospace;">
                                  ${requestId}
                                </span>
                              </td>
                            </tr>
                          </table>

                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ── CTA SECTION ── -->
                <tr>
                  <td align="center" style="padding:32px 36px 8px 36px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
                      xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${reviewUrl}"
                      style="height:52px;v-text-anchor:middle;width:280px;"
                      arcsize="8%" strokecolor="#0B3D91" fillcolor="#0B3D91">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;
                                     font-size:15px;font-weight:700;">
                        Review Access Request
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${reviewUrl}"
                       style="display:inline-block;
                               background-color:#0B3D91;
                               color:#ffffff;
                               font-family:Arial,Helvetica,sans-serif;
                               font-size:15px;font-weight:700;
                               text-decoration:none;
                               border-radius:6px;
                               padding:16px 40px;
                               letter-spacing:0.02em;
                               box-shadow:0 4px 12px rgba(11,61,145,0.3);"
                       target="_blank">
                      Review Access Request
                    </a>
                    <!--<![endif]-->
                    <p style="margin:12px 0 0 0;
                               font-family:Arial,Helvetica,sans-serif;
                               font-size:12px;color:#94a3b8;
                               text-align:center;line-height:1.6;">
                      You can approve, reject, and assign roles from
                      the secure admin review page.
                    </p>
                  </td>
                </tr>

                <!-- ── DIVIDER ── -->
                <tr>
                  <td style="padding:28px 36px 0 36px;">
                    <table role="presentation" cellspacing="0" cellpadding="0"
                      border="0" width="100%">
                      <tr>
                        <td style="border-top:1px solid #e2e8f0;
                                    font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ── SECURITY / AUDIT NOTE ── -->
                <tr>
                  <td style="padding:20px 36px 32px 36px;">
                    <table role="presentation" cellspacing="0" cellpadding="0"
                      border="0" width="100%"
                      style="background-color:#f8fafc;
                              border:1px solid #e2e8f0;
                              border-left:3px solid #0B3D91;
                              border-radius:4px;">
                      <tr>
                        <td style="padding:14px 18px;">
                          <p style="margin:0 0 6px 0;
                                     font-family:Arial,Helvetica,sans-serif;
                                     font-size:12px;font-weight:700;
                                     color:#374151;letter-spacing:0.02em;">
                            Security &amp; Audit Information
                          </p>
                          <p style="margin:0 0 4px 0;
                                     font-family:Arial,Helvetica,sans-serif;
                                     font-size:12px;color:#64748b;line-height:1.6;">
                            • Only authorized administrators should review access requests.
                          </p>
                          <p style="margin:0 0 4px 0;
                                     font-family:Arial,Helvetica,sans-serif;
                                     font-size:12px;color:#64748b;line-height:1.6;">
                            • All approval and rejection actions are logged and audited.
                          </p>
                          <p style="margin:0;
                                     font-family:Arial,Helvetica,sans-serif;
                                     font-size:12px;color:#64748b;line-height:1.6;">
                            • Role assignment occurs during the review process on the admin dashboard.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td align="center" style="padding:24px 16px 8px 16px;">
              <p style="margin:0 0 6px 0;
                         font-family:Arial,Helvetica,sans-serif;
                         font-size:11px;font-weight:700;
                         color:#94a3b8;letter-spacing:0.1em;
                         text-align:center;text-transform:uppercase;">
                AUTOMATE &bull; STREAMLINE &bull; TRANSFORM
              </p>
              <p style="margin:0 0 6px 0;
                         font-family:Arial,Helvetica,sans-serif;
                         font-size:12px;color:#94a3b8;text-align:center;">
                This is an automated system notification — please do not reply.
              </p>
              <p style="margin:0 0 6px 0;
                         font-family:Arial,Helvetica,sans-serif;
                         font-size:12px;color:#94a3b8;text-align:center;">
                Need help?&nbsp;
                <a href="mailto:support@varunerpsolutions.com"
                   style="color:#0B3D91;text-decoration:underline;">
                  support@varunerpsolutions.com
                </a>
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;
                         font-size:11px;color:#cbd5e1;text-align:center;">
                &copy; 2025 Varun ERP Solutions &middot; All rights reserved
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`.trim();

  const text = `
ACCESS APPROVAL REQUIRED
Identity & Access Management — Varun ERP Solutions

Hi ${params.adminName},

A verified user is requesting access to your organization environment.
Please review and take action at your earliest convenience.

REQUESTOR DETAILS
─────────────────
Full Name:     ${params.userName}
Email Address: ${params.userEmail}
Organization:  ${params.organizationName}
Requested At:  ${params.requestedAt}
Request ID:    ${requestId}

You can approve, reject, and assign roles from the secure admin review page.

Review Access Request:
${reviewUrl}

SECURITY & AUDIT INFORMATION
- Only authorized administrators should review access requests.
- All approval and rejection actions are logged and audited.
- Role assignment occurs during the review process.

AUTOMATE • STREAMLINE • TRANSFORM

This is an automated system notification — please do not reply.
Need help? support@varunerpsolutions.com

© 2025 Varun ERP Solutions · All rights reserved
  `.trim();

  return { subject, html, text };
}