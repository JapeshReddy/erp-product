function sanitize(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function buildApprovalEmail(params: {
  userName: string
  userEmail: string
  organizationName: string
  assignedRoles: string[]
  approvedAt: string
  appUrl: string
}): { subject: string; html: string; text: string } {
  const safeName = sanitize(params.userName)
  const safeOrg  = sanitize(params.organizationName)
  const rolesText = params.assignedRoles.join(', ')
  const loginUrl = `${params.appUrl}/signin`

  const subject = `Access Approved — Varun ERP Solutions`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Access Approved</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
  style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0"
      style="max-width:580px;width:100%;margin:0 auto;">
      <tr><td style="background:#0B3D91;height:4px;border-radius:8px 8px 0 0;font-size:0;">&nbsp;</td></tr>
      <tr><td style="background:#fff;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;
                      border-top:none;padding:36px 40px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td style="padding-bottom:24px;border-bottom:1px solid #f1f5f9;">
            <img src="https://trlyvlnziepzjqoabtve.supabase.co/storage/v1/object/public/branding/email_logo.png"
              alt="Varun ERP Solutions" width="200"
              style="display:block;height:auto;border:0;max-width:200px;"/>
          </td></tr>
          <tr><td style="padding:28px 0 16px;">
            <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;
                        border-radius:4px;padding:5px 12px;margin-bottom:16px;">
              <span style="font-size:12px;font-weight:700;color:#15803d;letter-spacing:0.04em;">
                ✓ ACCESS APPROVED
              </span>
            </div>
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
              Your Access Has Been Approved
            </h1>
            <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
              Hi ${safeName}, your request to access
              <strong style="color:#0B3D91;">${safeOrg}</strong>
              has been approved. You can now sign in to your account.
            </p>
          </td></tr>
          <tr><td style="padding-bottom:20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
              <tr><td style="padding:16px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                  style="margin-bottom:10px;">
                  <tr>
                    <td width="130"><span style="font-size:12px;font-weight:700;color:#64748b;">Organization</span></td>
                    <td><span style="font-size:13px;color:#0B3D91;font-weight:700;">${safeOrg}</span></td>
                  </tr>
                </table>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                  style="margin-bottom:10px;">
                  <tr>
                    <td width="130"><span style="font-size:12px;font-weight:700;color:#64748b;">Assigned Roles</span></td>
                    <td><span style="font-size:13px;color:#0f172a;font-weight:600;">${sanitize(rolesText)}</span></td>
                  </tr>
                </table>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td width="130"><span style="font-size:12px;font-weight:700;color:#64748b;">Approved At</span></td>
                    <td><span style="font-size:13px;color:#0f172a;">${params.approvedAt}</span></td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </td></tr>
          <tr><td align="center" style="padding:8px 0 24px;">
            <a href="${loginUrl}"
              style="display:inline-block;background:#0B3D91;color:#fff;
                      font-family:Arial,sans-serif;font-size:15px;font-weight:700;
                      text-decoration:none;border-radius:6px;padding:14px 40px;
                      box-shadow:0 4px 12px rgba(11,61,145,0.3);">
              Sign In to Your Account
            </a>
          </td></tr>
          <tr><td style="border-top:1px solid #e2e8f0;padding-top:20px;">
            <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
              If you have any questions, please contact
              <a href="mailto:support@varunerpsolutions.com"
                style="color:#0B3D91;text-decoration:underline;">
                support@varunerpsolutions.com
              </a>
            </p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:20px 0 0;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;
                   letter-spacing:0.1em;text-transform:uppercase;">
          AUTOMATE &bull; STREAMLINE &bull; TRANSFORM
        </p>
        <p style="margin:0;font-size:11px;color:#cbd5e1;">
          &copy; 2025 Varun ERP Solutions &middot; All rights reserved
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`.trim()

  const text = `
Access Approved — Varun ERP Solutions

Hi ${params.userName},

Your request to access ${params.organizationName} has been approved.

Organization: ${params.organizationName}
Assigned Roles: ${rolesText}
Approved At: ${params.approvedAt}

Sign in here: ${loginUrl}

Need help? support@varunerpsolutions.com
© 2025 Varun ERP Solutions
  `.trim()

  return { subject, html, text }
}

export function buildRejectionEmail(params: {
  userName: string
  organizationName: string
  rejectionReason: string
  rejectedAt: string
}): { subject: string; html: string; text: string } {
  const safeName   = sanitize(params.userName)
  const safeOrg    = sanitize(params.organizationName)
  const safeReason = sanitize(params.rejectionReason)

  const subject = `Access Request Update — Varun ERP Solutions`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Access Request Update</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
  style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0"
      style="max-width:580px;width:100%;margin:0 auto;">
      <tr><td style="background:#0B3D91;height:4px;border-radius:8px 8px 0 0;font-size:0;">&nbsp;</td></tr>
      <tr><td style="background:#fff;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;
                      border-top:none;padding:36px 40px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td style="padding-bottom:24px;border-bottom:1px solid #f1f5f9;">
            <img src="https://trlyvlnziepzjqoabtve.supabase.co/storage/v1/object/public/branding/email_logo.png"
              alt="Varun ERP Solutions" width="200"
              style="display:block;height:auto;border:0;max-width:200px;"/>
          </td></tr>
          <tr><td style="padding:28px 0 16px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
              Access Request Update
            </h1>
            <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
              Hi ${safeName}, we are writing to inform you about your access
              request for <strong style="color:#0B3D91;">${safeOrg}</strong>.
            </p>
          </td></tr>
          <tr><td style="padding-bottom:20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
              style="background:#fef2f2;border:1px solid #fecaca;
                      border-left:3px solid #dc2626;border-radius:6px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;
                           color:#b91c1c;letter-spacing:0.04em;text-transform:uppercase;">
                  Request Not Approved
                </p>
                <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
                  ${safeReason}
                </p>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="border-top:1px solid #e2e8f0;padding-top:20px;">
            <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
              If you believe this is an error or have questions, please contact
              <a href="mailto:support@varunerpsolutions.com"
                style="color:#0B3D91;text-decoration:underline;">
                support@varunerpsolutions.com
              </a>
            </p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:20px 0 0;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;
                   letter-spacing:0.1em;text-transform:uppercase;">
          AUTOMATE &bull; STREAMLINE &bull; TRANSFORM
        </p>
        <p style="margin:0;font-size:11px;color:#cbd5e1;">
          &copy; 2025 Varun ERP Solutions &middot; All rights reserved
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`.trim()

  const text = `
Access Request Update — Varun ERP Solutions

Hi ${params.userName},

Your access request for ${params.organizationName} was not approved.

Reason: ${params.rejectionReason}

If you have questions, contact support@varunerpsolutions.com
© 2025 Varun ERP Solutions
  `.trim()

  return { subject, html, text }
}