export interface ApiResponse {
  success: boolean
  code: string
  message: string
  data?: Record<string, unknown>
}

export interface AccessRequest {
  id: string
  client_id: string
  status: string
  requested_email: string
}

export interface OrgClient {
  id: string
  name: string
  status: string
}

export interface ClientAdmin {
  user_id: string
  role: string
  client_id: string
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

export interface SendEmailResult {
  messageId: string | null
  error: string | null
}