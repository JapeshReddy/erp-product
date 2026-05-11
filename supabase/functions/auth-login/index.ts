import { createClient } from '@supabase/supabase-js'
import { log, logError } from './logger.ts'
import { success, failure, corsPreflightResponse } from './response.ts'
import { validateLoginPayload } from './validators.ts'
import { VALID_ROLES } from './types.ts'
import {
  fetchClientUserByEmail,
  fetchClientUser,
  fetchClient,
  incrementFailedAttempts,
  resetFailedAttempts,
  updateLoginMetadata,
  insertUserSession,
  insertLoginAttempt,
} from './db.ts'
import {
  hashToken,
  extractIpAddress,
  detectDeviceName,
  sessionExpiresAt,
} from './security.ts'

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID()

  if (req.method === 'OPTIONS') return corsPreflightResponse()

  if (req.method !== 'POST') {
    return failure('METHOD_NOT_ALLOWED', 'Only POST requests are accepted.', 405)
  }

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return failure('INVALID_CONTENT_TYPE', 'Content-Type must be application/json.')
  }

  // ── Extract request metadata ──
  const ipAddress = extractIpAddress(req)
  const userAgent = req.headers.get('user-agent') ?? null
  const deviceName = detectDeviceName(userAgent)
  const now = new Date().toISOString()

  log(requestId, 'LOGIN_REQUEST_RECEIVED', { ip: ipAddress })

  // ── Env check ──
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

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 1 — VALIDATE REQUEST PAYLOAD
  // ────────────────────────────────────────────────────────────────────────────

  const validation = validateLoginPayload(rawBody)

  if (!validation.valid || !validation.data) {
    log(requestId, 'STEP_1_VALIDATION_FAILED', { reason: validation.error })

    await insertLoginAttempt(supabase, {
      email: (rawBody as Record<string, unknown>)?.email?.toString() ?? '',
      userId: null,
      clientId: null,
      ipAddress,
      userAgent,
      status: 'FAILED',
      failureReason: 'INVALID_REQUEST',
      requestPayload: { email: (rawBody as Record<string, unknown>)?.email ?? null },
      responsePayload: { code: 'INVALID_REQUEST' },
    })

    return failure('INVALID_REQUEST', validation.error ?? 'Invalid request payload.')
  }

  const { email, password } = validation.data
  const safeRequestPayload = { email }

  log(requestId, 'STEP_1_PAYLOAD_VALID', { email })

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 2 — CHECK ACCOUNT LOCK (pre-auth, by email)
  // ────────────────────────────────────────────────────────────────────────────

  const { data: preAuthUser } = await fetchClientUserByEmail(supabase, email)

  if (preAuthUser?.locked_until) {
    const lockedUntil = new Date(preAuthUser.locked_until)
    if (lockedUntil > new Date()) {
      log(requestId, 'STEP_2_ACCOUNT_LOCKED', {
        email,
        locked_until: preAuthUser.locked_until,
      })

      await insertLoginAttempt(supabase, {
        email,
        userId: preAuthUser.user_id,
        clientId: preAuthUser.client_id,
        ipAddress,
        userAgent,
        status: 'BLOCKED',
        failureReason: 'ACCOUNT_LOCKED',
        requestPayload: safeRequestPayload,
        responsePayload: { code: 'ACCOUNT_LOCKED' },
      })

      return failure(
        'ACCOUNT_LOCKED',
        'Account temporarily locked. Try again later.'
      )
    }
  }

  log(requestId, 'STEP_2_ACCOUNT_NOT_LOCKED', { email })

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 3 — AUTHENTICATE USER
  // ────────────────────────────────────────────────────────────────────────────

  log(requestId, 'STEP_3_AUTHENTICATING', { email })

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password })

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 4 — INVALID CREDENTIALS HANDLING
  // ────────────────────────────────────────────────────────────────────────────

  if (authError || !authData?.user) {
    log(requestId, 'STEP_4_INVALID_CREDENTIALS', { email })

    // Increment failed attempts if we found the user pre-auth
    if (preAuthUser) {
      await incrementFailedAttempts(
        supabase,
        preAuthUser.id,
        preAuthUser.failed_login_attempts
      )
    }

    await insertLoginAttempt(supabase, {
      email,
      userId: preAuthUser?.user_id ?? null,
      clientId: preAuthUser?.client_id ?? null,
      ipAddress,
      userAgent,
      status: 'FAILED',
      failureReason: 'INVALID_CREDENTIALS',
      requestPayload: safeRequestPayload,
      responsePayload: { code: 'INVALID_CREDENTIALS' },
    })

    return failure('INVALID_CREDENTIALS', 'Invalid email or password.')
  }

  const authUser = authData.user
  const authSession = authData.session

  log(requestId, 'STEP_4_AUTH_SUCCESS', { user_id: authUser.id })

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 5 — VALIDATE EMAIL VERIFICATION
  // ────────────────────────────────────────────────────────────────────────────

  if (!authUser.email_confirmed_at) {
    log(requestId, 'STEP_5_EMAIL_NOT_VERIFIED', { user_id: authUser.id })

    await insertLoginAttempt(supabase, {
      email,
      userId: authUser.id,
      clientId: preAuthUser?.client_id ?? null,
      ipAddress,
      userAgent,
      status: 'FAILED',
      failureReason: 'EMAIL_NOT_VERIFIED',
      requestPayload: safeRequestPayload,
      responsePayload: { code: 'EMAIL_NOT_VERIFIED' },
    })

    return failure(
      'EMAIL_NOT_VERIFIED',
      'Please verify your email before logging in.'
    )
  }

  log(requestId, 'STEP_5_EMAIL_VERIFIED', { user_id: authUser.id })

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 6 — FETCH USER MAPPING
  // ────────────────────────────────────────────────────────────────────────────

  const { data: clientUser, error: clientUserError } = await fetchClientUser(
    supabase,
    authUser.id
  )

  log(requestId, 'STEP_6_CLIENT_USER_FETCHED', {
    found: !!clientUser,
    user_id: authUser.id,
  })

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 7 — VALIDATE USER MAPPING
  // ────────────────────────────────────────────────────────────────────────────

  if (clientUserError || !clientUser) {
    log(requestId, 'STEP_7_USER_MAPPING_NOT_FOUND', { user_id: authUser.id })

    await insertLoginAttempt(supabase, {
      email,
      userId: authUser.id,
      clientId: null,
      ipAddress,
      userAgent,
      status: 'BLOCKED',
      failureReason: 'USER_MAPPING_NOT_FOUND',
      requestPayload: safeRequestPayload,
      responsePayload: { code: 'USER_MAPPING_NOT_FOUND' },
    })

    return failure(
      'PENDING_APPROVAL',
      'Your account is pending administrator approval.'
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 8 — VALIDATE ACTIVE USER
  // ────────────────────────────────────────────────────────────────────────────

  if (!clientUser.is_active) {
    log(requestId, 'STEP_8_USER_INACTIVE', { user_id: authUser.id })

    await insertLoginAttempt(supabase, {
      email,
      userId: authUser.id,
      clientId: clientUser.client_id,
      ipAddress,
      userAgent,
      status: 'BLOCKED',
      failureReason: 'USER_INACTIVE',
      requestPayload: safeRequestPayload,
      responsePayload: { code: 'USER_INACTIVE' },
    })

    return failure('USER_INACTIVE', 'Your account is inactive.')
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 9 — VALIDATE ROLE
  // ────────────────────────────────────────────────────────────────────────────

  const role = clientUser.role as string | null

  if (!role || !VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    log(requestId, 'STEP_9_ROLE_NOT_ASSIGNED', {
      user_id: authUser.id,
      role,
    })

    await insertLoginAttempt(supabase, {
      email,
      userId: authUser.id,
      clientId: clientUser.client_id,
      ipAddress,
      userAgent,
      status: 'BLOCKED',
      failureReason: 'ROLE_NOT_ASSIGNED',
      requestPayload: safeRequestPayload,
      responsePayload: { code: 'ROLE_NOT_ASSIGNED' },
    })

    return failure('ROLE_NOT_ASSIGNED', 'User role is not assigned.')
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 10 & 11 — FETCH + VALIDATE CLIENT
  // ────────────────────────────────────────────────────────────────────────────

  const { data: orgClient, error: orgError } = await fetchClient(
    supabase,
    clientUser.client_id
  )

  log(requestId, 'STEP_10_CLIENT_FETCHED', {
    client_id: clientUser.client_id,
    found: !!orgClient,
  })

  if (orgError || !orgClient) {
    log(requestId, 'STEP_11_CLIENT_NOT_FOUND', {
      client_id: clientUser.client_id,
    })

    await insertLoginAttempt(supabase, {
      email,
      userId: authUser.id,
      clientId: clientUser.client_id,
      ipAddress,
      userAgent,
      status: 'BLOCKED',
      failureReason: 'CLIENT_INACTIVE',
      requestPayload: safeRequestPayload,
      responsePayload: { code: 'CLIENT_NOT_FOUND' },
    })

    return failure('CLIENT_INACTIVE', 'Organization account is inactive.')
  }

  if (orgClient.status !== 'ACTIVE') {
    log(requestId, 'STEP_11_CLIENT_INACTIVE', {
      client_id: clientUser.client_id,
      status: orgClient.status,
    })

    await insertLoginAttempt(supabase, {
      email,
      userId: authUser.id,
      clientId: clientUser.client_id,
      ipAddress,
      userAgent,
      status: 'BLOCKED',
      failureReason: 'CLIENT_INACTIVE',
      requestPayload: safeRequestPayload,
      responsePayload: { code: 'CLIENT_INACTIVE' },
    })

    return failure('CLIENT_INACTIVE', 'Organization account is inactive.')
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 12 — RESET FAILED ATTEMPTS
  // ────────────────────────────────────────────────────────────────────────────

  await resetFailedAttempts(supabase, clientUser.id)
  log(requestId, 'STEP_12_ATTEMPTS_RESET', { user_id: authUser.id })

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 13 — UPDATE LOGIN METADATA
  // ────────────────────────────────────────────────────────────────────────────

  await updateLoginMetadata(supabase, clientUser.id, ipAddress)
  log(requestId, 'STEP_13_METADATA_UPDATED', { user_id: authUser.id })

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 14 — INSERT USER SESSION
  // ────────────────────────────────────────────────────────────────────────────

  const refreshTokenHash = authSession?.refresh_token
    ? await hashToken(authSession.refresh_token)
    : await hashToken(crypto.randomUUID())

  await insertUserSession(supabase, {
    user_id: authUser.id,
    client_id: clientUser.client_id,
    refresh_token_hash: refreshTokenHash,
    ip_address: ipAddress,
    user_agent: userAgent,
    device_name: deviceName,
    is_active: true,
    last_activity_at: now,
    expires_at: sessionExpiresAt(7),
  })

  log(requestId, 'STEP_14_SESSION_INSERTED', { user_id: authUser.id })

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 15 — INSERT SUCCESSFUL LOGIN ATTEMPT
  // ────────────────────────────────────────────────────────────────────────────

  const sanitizedResponse = {
    user_id: authUser.id,
    client_id: clientUser.client_id,
    client_name: orgClient.name,
    role,
  }

  await insertLoginAttempt(supabase, {
    email,
    userId: authUser.id,
    clientId: clientUser.client_id,
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    failureReason: null,
    requestPayload: safeRequestPayload,
    responsePayload: sanitizedResponse,
  })

  log(requestId, 'STEP_15_LOGIN_ATTEMPT_LOGGED', { user_id: authUser.id })

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 16 — RETURN SANITIZED RESPONSE
  // ────────────────────────────────────────────────────────────────────────────

  log(requestId, 'LOGIN_COMPLETE', {
    user_id: authUser.id,
    client_id: clientUser.client_id,
    role,
  })

  return success(
    'LOGIN_SUCCESS',
    'Login successful.',
    sanitizedResponse,
    authSession
      ? {
          access_token: authSession.access_token,
          refresh_token: authSession.refresh_token,
        }
      : undefined
  )
})