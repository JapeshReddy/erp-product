import type { SmtpConfig, SendEmailResult } from './types.ts'
import nodemailer from 'npm:nodemailer@6'

interface SendParams {
  smtp: SmtpConfig
  to: string
  subject: string
  html: string
  text: string
}

export async function sendSmtpEmail(
  params: SendParams
): Promise<SendEmailResult> {
  try {
    const transporter = nodemailer.createTransport({
      host: params.smtp.smtp_host,
      port: params.smtp.port,
      secure: params.smtp.port === 465, // true for SSL on port 465
      auth: {
        user: params.smtp.username,
        pass: params.smtp.password,
      },
    })

    // Verify connection before sending
    try {
      await transporter.verify()
    } catch (err) {
      return {
        messageId: null,
        error: `SMTP connection failed: ${String(err)}`,
      }
    }

    const fromAddress = params.smtp.from_name
      ? `${params.smtp.from_name} <${params.smtp.from_email}>`
      : params.smtp.from_email

    const info = await transporter.sendMail({
      from: fromAddress,
      to: params.to,
      replyTo: params.smtp.reply_to_email ?? params.smtp.from_email,
      subject: params.subject,
      text: params.text,
      html: params.html,
    })

    return {
      messageId: info.messageId ?? crypto.randomUUID(),
      error: null,
    }

  } catch (err) {
    return {
      messageId: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}