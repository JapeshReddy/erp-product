export type AccessRequestStatus =
  | 'PENDING_EMAIL_VERIFICATION'
  | 'PENDING_ADMIN_APPROVAL'
  | 'PENDING_ADMIN_ASSIGNMENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'

export type UserRole = 'ADMIN' | 'ALL_ACCESS' | 'CREATE' | 'READ'

export const USER_ROLES: UserRole[] = ['ADMIN', 'ALL_ACCESS', 'CREATE', 'READ']

export interface AccessRequest {
  id: string
  user_id: string
  client_id: string
  requested_email: string
  requested_domain: string
  status: AccessRequestStatus
  request_source: string
  created_at: string
  updated_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  rejected_reason: string | null
  assigned_role: string | null
}

export interface RequestReviewPayload {
  requestId: string
  action: 'APPROVE' | 'REJECT'
  roles?: UserRole[]
  reason?: string
}

export interface ReviewResponse {
  success: boolean
  code: string
  message: string
  data?: Record<string, unknown>
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  client_id: string
}