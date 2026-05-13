import { createClient } from '@supabase/supabase-js'
import type {
  ClientUser,
  OrgClient,
  LoginAttemptRow,
  UserSessionRow,
  LoginStatus,
  FailureReason,
} from './types.ts'
import { LOCK_THRESHOLD, LOCK_DURATION_MINUTES, LOCK_WINDOW_MINUTES } from './validators.ts'

type SupabaseClient = ReturnType<typeof createClient>

// ─── Fetch client_user by user_id ─────────────────────────────────────────────

export async function fetchClientUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: ClientUser | null; error: unknown }> {
  const { data, error } = await supabase
    .schema('product')
    .from('client_users')
    .select('id, user_id, client_id, role, is_active, failed_login_attempts, locked_until, last_login_at, last_login_ip')
    .eq('user_id', userId)
    .maybeSingle()

  return { data: data as ClientUser | null, error }
}

// ─── Fetch client by id ────────────────────────────────────────────────────────

export async function fetchClient(
  supabase: SupabaseClient,
  clientId: string
): Promise<{ data: OrgClient | null; error: unknown }> {
  const { data, error } = await supabase
    .schema('product')
    .from('clients')
    .select('id, name, status')
    .eq('id', clientId)
    .maybeSingle()

  return { data: data as OrgClient | null, error }
}

// ─── Fetch client_user by email (for pre-auth lock check) ────────────────────
// Uses a join via auth.users — we look up by email then resolve user_id

export async function fetchClientUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<{ data: ClientUser | null; error: unknown }> {
  // List all users and find by email (acceptable at login scale; see index note)
  const { data: userList } = await supabase.auth.admin.listUsers()
  const authUser = userList?.users?.find((u) => u.email === email)
  if (!authUser) return { data: null, error: null }

  return fetchClientUser(supabase, authUser.id)
}

// ─── Increment failed attempts + maybe lock ────────────────────────────────────

export async function incrementFailedAttempts(
  supabase: SupabaseClient,
  clientUserId: string,
  currentAttempts: number
): Promise<void> {
  const newCount = currentAttempts + 1
  const shouldLock = newCount >= LOCK_THRESHOLD

  const now = new Date()
  const lockedUntil = shouldLock
    ? new Date(now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()
    : null

  const update: Record<string, unknown> = {
    failed_login_attempts: newCount,
    updated_at: now.toISOString(),
  }
  if (shouldLock) update.locked_until = lockedUntil

  await supabase
    .schema('product')
    .from('client_users')
    .update(update)
    .eq('id', clientUserId)
}

// ─── Reset failed attempts on success ─────────────────────────────────────────

export async function resetFailedAttempts(
  supabase: SupabaseClient,
  clientUserId: string
): Promise<void> {
  await supabase
    .schema('product')
    .from('client_users')
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientUserId)
}

// ─── Update login metadata ─────────────────────────────────────────────────────

export async function updateLoginMetadata(
  supabase: SupabaseClient,
  clientUserId: string,
  ipAddress: string | null
): Promise<void> {
  const now = new Date().toISOString()
  await supabase
    .schema('product')
    .from('client_users')
    .update({
      last_login_at: now,
      last_login_ip: ipAddress,
      updated_at: now,
    })
    .eq('id', clientUserId)
}

// ─── Insert user session ───────────────────────────────────────────────────────

export async function insertUserSession(
  supabase: SupabaseClient,
  row: UserSessionRow
): Promise<void> {
  await supabase.schema('product').from('user_sessions').insert(row)
}

// ─── Insert login attempt ──────────────────────────────────────────────────────

export async function insertLoginAttempt(
  supabase: SupabaseClient,
  params: {
    email: string
    userId: string | null
    clientId: string | null
    ipAddress: string | null
    userAgent: string | null
    status: LoginStatus
    failureReason: FailureReason | null
    requestPayload: Record<string, unknown>
    responsePayload: Record<string, unknown>
  }
): Promise<void> {
  const row = {
    email: params.email,
    user_id: params.userId,
    client_id: params.clientId,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    status: params.status,
    failure_reason: params.failureReason ?? null,
    request_payload: params.requestPayload,
    response_payload: params.responsePayload,
  }

  const { error: insertError } = await supabase
  .schema('product')
    .from('login_attempts')
    .insert(row)
  if (insertError) {
    console.error(JSON.stringify({ stage: 'INSERT_LOGIN_ATTEMPT_FAILED', error: insertError, row }))
  }
}

// ─── Count recent failed attempts (for rate-limit reporting) ──────────────────

export async function countRecentFailedAttempts(
  supabase: SupabaseClient,
  email: string
): Promise<number> {
  const windowStart = new Date(
    Date.now() - LOCK_WINDOW_MINUTES * 60 * 1000
  ).toISOString()

  const { count } = await supabase
    .schema('product')
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .eq('status', 'FAILED')
    .gte('attempted_at', windowStart)

  return count ?? 0
}



// ─── Fetch client_admin by user_id ────────────────────────────────────────────

export async function fetchClientAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: { user_id: string; client_id: string } | null; error: unknown }> {
  const { data, error } = await supabase
    .schema('product')
    .from('client_admins')
    .select('user_id, client_id')
    .eq('user_id', userId)
    .maybeSingle()

  return { data, error }
}