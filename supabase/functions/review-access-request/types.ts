export interface ReviewPayload {
  requestId: string
  action: 'APPROVE' | 'REJECT'
  roles?: string[]
  reason?: string
}

export interface ApiResponse {
  success: boolean
  code: string
  message: string
  data?: Record<string, unknown>
}

export interface AccessRequest {
  id: string
  user_id: string
  client_id: string
  requested_email: string
  status: string
}

export interface SmtpConfig {
  smtp_host: string
  port: number
  username: string
  password: string
  from_email: string
  from_name: string | null
  reply_to_email: string | null
}