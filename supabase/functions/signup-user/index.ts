import { createClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignupPayload {
  full_name: string
  email: string
  password: string
  client_id: string
}

interface ApiResponse {
  success: boolean
  code: string
  message: string
  data?: Record<string, unknown>
}

interface OrgClient {
  id: string
  name: string
  status: string
  allowed_email_domains: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FULL_NAME = 100
const MAX_EMAIL = 320
const MAX_PASSWORD = 128
const DEFAULT_ROLE = null
const REQUEST_SOURCE = 'signup'
const REDIRECT_URL = 'http://localhost:5173/auth/confirm'

// ─── Response Helpers ─────────────────────────────────────────────────────────

function respond(body: ApiResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    },
  })
}

function success(
  message: string,
  data?: Record<string, unknown>
): Response {
  return respond({ success: true, code: 'SIGNUP_SUCCESS', message, data })
}

function failure(
  code: string,
  message: string,
  status = 400
): Response {
  return respond({ success: false, code, message }, status)
}

// ─── Logger ───────────────────────────────────────────────────────────────────

function log(
  requestId: string,
  stage: string,
  data: Record<string, unknown> = {}
) {
  console.log(
    JSON.stringify({
      request_id: requestId,
      stage,
      timestamp: new Date().toISOString(),
      ...data,
    })
  )
}

function logError(
  requestId: string,
  stage: string,
  error: unknown
) {
  console.error(
    JSON.stringify({
      request_id: requestId,
      stage,
      timestamp: new Date().toISOString(),
      error: error instanceof Error
        ? error.message
        : typeof error === 'object'
          ? JSON.stringify(error)
          : String(error),
    })
  )
}

// ─── Validators ───────────────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) &&
    email.length <= MAX_EMAIL
  )
}

function validatePassword(
  password: string
): { valid: boolean; reason?: string } {
  if (password.length < 8)
    return { valid: false, reason: 'Password must be at least 8 characters.' }
  if (password.length > MAX_PASSWORD)
    return { valid: false, reason: 'Password is too long.' }
  if (!/[A-Z]/.test(password))
    return { valid: false, reason: 'Password must contain an uppercase letter.' }
  if (!/[a-z]/.test(password))
    return { valid: false, reason: 'Password must contain a lowercase letter.' }
  if (!/[0-9]/.test(password))
    return { valid: false, reason: 'Password must contain a number.' }
  if (!/[^A-Za-z0-9]/.test(password))
    return { valid: false, reason: 'Password must contain a special character.' }
  return { valid: true }
}

function extractDomain(email: string): string {
  return email.split('@')[1].trim().toLowerCase()
}

function generateRequestId(): string {
  return crypto.randomUUID()
}

function validatePayload(body: unknown): {
  valid: boolean
  error?: string
  data?: SignupPayload
} {
  if (!body || typeof body !== 'object')
    return { valid: false, error: 'Invalid request body.' }

  const b = body as Record<string, unknown>

  if (
    !b.full_name ||
    typeof b.full_name !== 'string' ||
    b.full_name.trim().length < 2
  )
    return { valid: false, error: 'Full name must be at least 2 characters.' }

  if (b.full_name.trim().length > MAX_FULL_NAME)
    return { valid: false, error: 'Full name is too long.' }

  if (!b.email || typeof b.email !== 'string')
    return { valid: false, error: 'Email is required.' }

  const email = b.email.trim().toLowerCase()
  if (!validateEmail(email))
    return { valid: false, error: 'Invalid email address.' }

  if (!b.password || typeof b.password !== 'string')
    return { valid: false, error: 'Password is required.' }

  const passCheck = validatePassword(b.password)
  if (!passCheck.valid)
    return { valid: false, error: passCheck.reason }

  if (
    !b.client_id ||
    typeof b.client_id !== 'string' ||
    !b.client_id.trim()
  )
    return { valid: false, error: 'Organization is required.' }

  return {
    valid: true,
    data: {
      full_name: b.full_name.trim(),
      email,
      password: b.password as string,
      client_id: b.client_id.trim(),
    },
  }
}

// ─── Rollback Helper ──────────────────────────────────────────────────────────

async function rollbackUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  requestId: string
) {
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) {
      logError(requestId, 'ROLLBACK_DELETE_FAILED', {
        message: error.message,
        user_id: userId,
      })
    } else {
      log(requestId, 'ROLLBACK_USER_DELETED', { user_id: userId })
    }
  } catch (err) {
    logError(requestId, 'ROLLBACK_EXCEPTION', {
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId()

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  // Method check
  if (req.method !== 'POST')
    return failure('METHOD_NOT_ALLOWED', 'Only POST requests are accepted.', 405)

  // Content-Type check
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json'))
    return failure('INVALID_CONTENT_TYPE', 'Content-Type must be application/json.')

  log(requestId, 'REQUEST_RECEIVED')

  // ── Env validation ──
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    logError(requestId, 'ENV_MISSING', 'Missing environment variables')
    return failure('CONFIG_ERROR', 'Internal configuration error.', 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Parse body ──
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return failure('INVALID_JSON', 'Request body is not valid JSON.')
  }

  // ── Validate payload ──
  const validation = validatePayload(rawBody)
  if (!validation.valid || !validation.data) {
    log(requestId, 'VALIDATION_FAILED', { reason: validation.error })
    return failure('VALIDATION_ERROR', validation.error ?? 'Invalid request.')
  }

  const { full_name, email, password, client_id } = validation.data
  const domain = extractDomain(email)

  log(requestId, 'PAYLOAD_VALIDATED', { client_id, domain })

  // ── STEP 1: Validate organization ──
  const { data: clientData, error: clientError } = await supabase
    .schema('product')
    .from('clients')
    .select('id, name, status, allowed_email_domains')
    .eq('id', client_id)
    .eq('status', 'ACTIVE')
    .single()

  if (clientError || !clientData) {
    log(requestId, 'ORG_NOT_FOUND', { client_id })
    return failure('INVALID_ORGANIZATION', 'Invalid or inactive organization.')
  }

  const org = clientData as OrgClient

  const domainAllowed = org.allowed_email_domains?.some(
    (d: string) => d.trim().toLowerCase() === domain
  )

  if (!domainAllowed) {
    log(requestId, 'DOMAIN_MISMATCH', { domain, client_id })
    return failure(
      'INVALID_EMAIL_DOMAIN',
      'Your email domain is not allowed for the selected organization.'
    )
  }

  log(requestId, 'ORG_VALIDATED', { client_id, org_name: org.name })

  // ── STEP 2: Check existing user ──
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find((u) => u.email === email)

  if (existingUser) {
    log(requestId, 'DUPLICATE_EMAIL', { email })
    return failure(
      'EMAIL_ALREADY_EXISTS',
      'An account already exists for this email.'
    )
  }

  // Check existing pending access request
  const { data: existingRequest } = await supabase
    .schema('product')
    .from('access_requests')
    .select('id, status')
    .eq('requested_email', email)
    .eq('client_id', client_id)
    .in('status', ['PENDING', 'APPROVED'])
    .maybeSingle()

  if (existingRequest) {
    log(requestId, 'DUPLICATE_REQUEST', {
      email,
      status: existingRequest.status,
    })
    return failure(
      'REQUEST_ALREADY_EXISTS',
      existingRequest.status === 'APPROVED'
        ? 'This email has already been approved. Please sign in.'
        : 'A pending request already exists for this email.'
    )
  }

  // ── STEP 3: Create auth user ──
  // email_confirm: false → Supabase will send verification email automatically
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name,
        client_id,
        organization_name: org.name,
        signup_source: 'self_signup',
      },
      app_metadata: {
        onboarding_status: 'pending_verification',
        tenant_id: client_id,
      },
    })

  if (authError || !authData?.user) {
    logError(requestId, 'AUTH_CREATION_FAILED', authError)
    return failure(
      'SIGNUP_FAILED',
      'Unable to create account. Please try again.',
      500
    )
  }

  const userId = authData.user.id
  log(requestId, 'AUTH_USER_CREATED', { user_id: userId })

  // ── STEP 4 & 5: Fetch primary admin ──
  const { data: adminData } = await supabase
    .schema('product')
    .from('client_admins')
    .select('user_id')
    .eq('client_id', client_id)
    .eq('is_primary', true)
    .maybeSingle()

  const accessRequestStatus = adminData
    ? 'PENDING_ADMIN_APPROVAL'
    : 'PENDING_ADMIN_ASSIGNMENT'

  if (!adminData) {
    log(requestId, 'PRIMARY_ADMIN_NOT_FOUND', { client_id })
  }

  // ── STEP 6: Send verification email ──
  // Using resend — this triggers the actual email via your configured SMTP
  const now = new Date().toISOString()
  let emailStatus = 'SENT'
  let emailErrorMsg: string | null = null

  try {
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: REDIRECT_URL,
      },
    })

    if (resendErr) throw resendErr
    log(requestId, 'VERIFICATION_EMAIL_SENT', { email })

  } catch (err) {
    logError(requestId, 'VERIFICATION_EMAIL_FAILED', {
      message: err instanceof Error ? err.message : JSON.stringify(err),
    })

    emailStatus = 'FAILED'
    emailErrorMsg = err instanceof Error ? err.message : 'Email send failed'

    // ── Rollback: delete created user ──
    await rollbackUser(supabase, userId, requestId)

    // ── Log failure ──
    await supabase
      .schema('product')
      .from('email_logs')
      .insert({
        client_id,
        recipient_email: email,
        email_type: 'EMAIL_VERIFICATION',
        status: 'FAILED',
        error_message: emailErrorMsg,
        provider_message_id: null,
        metadata: {
          provider: 'supabase-auth',
          template: 'verification',
          source: 'signup-flow',
          organization_name: org.name,
        },
        access_request_id: null,
        sent_at: null,
        created_at: now,
        updated_at: now,
      })

    return failure(
      'VERIFICATION_EMAIL_FAILED',
      'Unable to send verification email. Please try again.',
      500
    )
  }

  // ── STEP 7: Insert access request ──
  const { data: accessRequest, error: accessError } = await supabase
    .schema('product')
    .from('access_requests')
    .insert({
      user_id: userId,
      client_id,
      requested_email: email,
      requested_domain: domain,
      assigned_role: null,
      status: accessRequestStatus,
      request_source: REQUEST_SOURCE,
      expires_at: null,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (accessError) {
    logError(requestId, 'ACCESS_REQUEST_INSERT_FAILED', {
      message: accessError.message,
      code: accessError.code,
      details: accessError.details,
      hint: accessError.hint,
    })
  } else {
    log(requestId, 'ACCESS_REQUEST_CREATED', {
      access_request_id: accessRequest?.id,
    })
  }

  // ── STEP 8: Insert email log ──
  const { error: emailLogError } = await supabase
    .schema('product')
    .from('email_logs')
    .insert({
      client_id,
      recipient_email: email,
      email_type: 'EMAIL_VERIFICATION',
      status: emailStatus,
      error_message: emailErrorMsg,
      provider_message_id: null,
      metadata: {
        provider: 'supabase-auth',
        template: 'verification',
        source: 'signup-flow',
        organization_name: org.name,
      },
      access_request_id: accessRequest?.id ?? null,
      sent_at: emailStatus === 'SENT' ? now : null,
      created_at: now,
      updated_at: now,
    })

  if (emailLogError) {
    logError(requestId, 'EMAIL_LOG_INSERT_FAILED', emailLogError)
  }

  log(requestId, 'SIGNUP_COMPLETE', { user_id: userId, client_id })

  return success('Verification email sent successfully.', {
    email,
    client_id,
  })
})