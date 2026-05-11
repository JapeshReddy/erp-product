// ─── Request ──────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string
  password: string
}

// ─── DB Row Shapes ────────────────────────────────────────────────────────────

export interface ClientUser {
  id: string
  user_id: string
  client_id: string
  role: string | null
  is_active: boolean
  failed_login_attempts: number
  locked_until: string | null
  last_login_at: string | null
  last_login_ip: string | null
}

export interface OrgClient {
  id: string
  name: string
  status: string
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface ApiResponse {
  success: boolean
  code: string
  message: string
  data?: Record<string, unknown>
  session?: {
    access_token: string
    refresh_token: string
  }
}

// ─── Login Attempt ────────────────────────────────────────────────────────────

export type LoginStatus = 'SUCCESS' | 'FAILED' | 'BLOCKED'

export type FailureReason =
  | 'INVALID_REQUEST'
  | 'ACCOUNT_LOCKED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'USER_MAPPING_NOT_FOUND'
  | 'USER_INACTIVE'
  | 'ROLE_NOT_ASSIGNED'
  | 'CLIENT_INACTIVE'

export interface LoginAttemptRow {
  email: string
  user_id: string | null
  client_id: string | null
  ip_address: string | null
  user_agent: string | null
  status: LoginStatus
  failure_reason: FailureReason | null
  request_payload: Record<string, unknown>
  response_payload: Record<string, unknown>
  attempted_at: string
}

// ─── User Session ─────────────────────────────────────────────────────────────

export interface UserSessionRow {
  user_id: string
  client_id: string
  refresh_token_hash: string
  ip_address: string | null
  user_agent: string | null
  device_name: string | null
  is_active: boolean
  last_activity_at: string
  expires_at: string
}

// ─── Valid Roles ───────────────────────────────────────────────────────────────

export const VALID_ROLES = ['ADMIN', 'ALL_ACCESS', 'CREATE', 'READ'] as const
export type UserRole = (typeof VALID_ROLES)[number]