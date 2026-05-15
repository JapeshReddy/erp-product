import nodemailer from 'npm:nodemailer@6'
import type { ExtractedFile, SmtpCredentials } from './types.ts'
import { uint8ArrayToBase64 }                  from './validator.ts'

// ── S3-bound inbound email address ────────────────────────────────────────────
// SES is configured to deliver emails to this address into the S3 bucket
// "emails-pdfs".  Every invoice upload is sent here so the Lambda pipeline
// picks it up automatically.

const INBOUND_EMAIL = Deno.env.get('SES_INBOUND_EMAIL') ?? 'inbound@nchanda.varunerpsolutions.com'
const S3_BUCKET     = 'emails-pdfs'

// ── loadSmtpCredentials ───────────────────────────────────────────────────────
// Reads SMTP config from Supabase secrets.
// Host and port are kept in env vars so they can differ between environments.

export function loadSmtpCredentials(): SmtpCredentials | null {
  const host = Deno.env.get('SMTP_HOST1') ?? 'smtp.hostinger.com'
  const port = parseInt(Deno.env.get('SMTP_PORT1') ?? '465', 10)
  const user = Deno.env.get('SMTP_USER1')
  const pass = Deno.env.get('SMTP_PASS1')

  if (!user || !pass) return null

  return { host, port, user, pass }
}

// ── sendInvoiceEmail ──────────────────────────────────────────────────────────
// Sends the invoice file as an email attachment.
// From:    the logged-in user's email (resolved from JWT)
// To:      SES inbound address → triggers Lambda pipeline → S3 bucket
//
// @param creds      – SMTP credentials
// @param senderEmail – logged-in user's email (from JWT)
// @param file        – validated file buffer

export async function sendInvoiceEmail(
  creds:       SmtpCredentials,
  senderEmail: string,
  file:        ExtractedFile
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host:   creds.host,
    port:   creds.port,
    secure: creds.port === 465,  // implicit SSL on 465, STARTTLS on 587
    auth: {
      user: creds.user,
      pass: creds.pass,
    },
  })

  // Verify SMTP connection before attempting send
  try {
    await transporter.verify()
  } catch (err) {
    throw {
      code:    'SMTP_CONNECTION_FAILED',
      details: `${creds.host}:${creds.port} — ${String(err)}`,
    }
  }

  // Send email — From is the logged-in user so the sender is traceable
  try {
    await transporter.sendMail({
      from:    `"${senderEmail}" <${creds.user}>`,  // display name = user email
      to:      INBOUND_EMAIL,
      subject: `Invoice Upload — ${file.name}`,
      text:    `Invoice uploaded by ${senderEmail}`,
      html:    `<p>Invoice uploaded by <strong>${senderEmail}</strong></p>`,
      attachments: [
        {
          filename:    file.name,
          content:     uint8ArrayToBase64(file.buffer),
          encoding:    'base64',
          contentType: file.type,
        },
      ],
    })
  } catch (err) {
    throw {
      code:    'EMAIL_SEND_FAILED',
      details: String(err),
    }
  }

  console.log(JSON.stringify({
    stage:       'EMAIL_SENT',
    from:        senderEmail,
    to:          INBOUND_EMAIL,
    file:        file.name,
    s3_bucket:   S3_BUCKET,
    timestamp:   new Date().toISOString(),
  }))
}

export { INBOUND_EMAIL, S3_BUCKET }