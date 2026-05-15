import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import {
  corsPreflightResponse,
  successResponse,
  errorResponse
} from './response.ts'

import { resolveUserEmail } from './auth.ts'

import { extractAndValidateFile } from './validator.ts'

import {
  loadSmtpCredentials,
  sendInvoiceEmail,
  INBOUND_EMAIL,
  S3_BUCKET
} from './mailer.ts'

Deno.serve(async (req: Request): Promise<Response> => {

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('[FUNCTION] upload-invoice-email started')
  console.log('[FUNCTION] Method:', req.method)
  console.log('[FUNCTION] Timestamp:', new Date().toISOString())

  // ── CORS preflight ──
  if (req.method === 'OPTIONS') {

    console.log('[CORS] OPTIONS request')

    return corsPreflightResponse()
  }

  if (req.method !== 'POST') {

    console.error('[REQUEST] Invalid HTTP method:', req.method)

    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Only POST requests accepted.',
      undefined,
      405
    )
  }

  // ── Step 1: Verify JWT and resolve sender email ──

  console.log('[AUTH] Resolving user email')

  let userInfo

  try {

    userInfo = await resolveUserEmail(req)

    console.log('[AUTH] resolveUserEmail completed')

  } catch (err) {

    console.error('[AUTH] resolveUserEmail crashed:', err)

    return errorResponse(
      'AUTH_MISSING',
      'Authentication failed.',
      String(err),
      401
    )
  }

  if (!userInfo) {

    console.error('[AUTH] No user info returned')

    return errorResponse(
      'AUTH_MISSING',
      'Authentication required. Please log in and try again.',
      undefined,
      401
    )
  }

  const { email: senderEmail } = userInfo

  console.log(JSON.stringify({
    stage: 'REQUEST_AUTHENTICATED',
    user: senderEmail,
    timestamp: new Date().toISOString(),
  }))

  // ── Step 2: Extract and validate file ──

  console.log('[FILE] Starting validation')

  const fileResult = await extractAndValidateFile(req)

  console.log('[FILE] Validation completed')

  if (fileResult instanceof Response) {

    console.error('[FILE] Validation returned error response')

    return fileResult
  }

  const { file } = fileResult

  console.log(JSON.stringify({
    stage: 'FILE_VALIDATED',
    file_name: file.name,
    file_type: file.type,
    file_size: file.buffer.length,
    timestamp: new Date().toISOString(),
  }))

  // ── Step 3: Load SMTP credentials ──

  console.log('[SMTP] Loading SMTP credentials')

  let smtpCreds

  try {

    smtpCreds = loadSmtpCredentials()

    console.log('[SMTP] Credentials loaded')

  } catch (err) {

    console.error('[SMTP] loadSmtpCredentials crashed:', err)

    return errorResponse(
      'SMTP_CONFIG_MISSING',
      'Failed loading SMTP credentials.',
      String(err),
      500
    )
  }

  if (!smtpCreds) {

    console.error('[SMTP] Credentials missing')

    return errorResponse(
      'SMTP_CONFIG_MISSING',
      'SMTP credentials not configured. Contact your administrator.',
      undefined,
      500
    )
  }

  console.log('[SMTP] SMTP configuration exists')

  // ── Step 4: Send email with invoice attachment ──

  console.log('[EMAIL] Starting email send')
  console.log('[EMAIL] From:', senderEmail)
  console.log('[EMAIL] To:', INBOUND_EMAIL)
  console.log('[EMAIL] Attachment:', file.name)
  console.log('[EMAIL] Attachment size:', file.buffer.length)

  try {

    await sendInvoiceEmail(
      smtpCreds,
      senderEmail,
      file
    )

    console.log('[EMAIL] Email sent successfully')

  } catch (err: unknown) {

    console.error('[EMAIL] sendInvoiceEmail failed:', err)

    const e = err as {
      code?: string
      details?: string
    }

    if (e.code === 'SMTP_CONNECTION_FAILED') {

      console.error('[EMAIL] SMTP connection failed')

      return errorResponse(
        'SMTP_CONNECTION_FAILED',
        'Could not connect to the email server. Please try again.',
        e.details,
        502
      )
    }

    return errorResponse(
      'EMAIL_SEND_FAILED',
      'Failed to send invoice email. Please try again.',
      e.details || String(err),
      502
    )
  }

  // ── Step 5: Return success ──

  console.log('[SUCCESS] Returning success response')

  return successResponse({
    file_name: file.name,
    sent_from: senderEmail,
    sent_to: INBOUND_EMAIL,
    s3_bucket: S3_BUCKET,
  })
})