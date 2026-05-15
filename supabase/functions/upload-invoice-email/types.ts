// ─── Request ──────────────────────────────────────────────────────────────────
// Received as multipart/form-data with:
//   file  — the PDF/image attachment
//   (sender email resolved from JWT token, never from client)

// ─── Response ─────────────────────────────────────────────────────────────────

export interface UploadResponse {
  success: boolean
  code:    string
  message: string
  data?: {
    file_name:   string
    sent_from:   string
    sent_to:     string
    s3_bucket:   string
  }
  error?: string
}

// ─── Error codes ──────────────────────────────────────────────────────────────

export type ErrorCode =
  | 'AUTH_MISSING'
  | 'AUTH_INVALID'
  | 'FILE_MISSING'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_FILE'
  | 'FILE_READ_ERROR'
  | 'SMTP_CONFIG_MISSING'
  | 'SMTP_CONNECTION_FAILED'
  | 'EMAIL_SEND_FAILED'
  | 'INTERNAL_SERVER_ERROR'

// ─── Validated file shape ─────────────────────────────────────────────────────

export interface ExtractedFile {
  name:   string
  buffer: Uint8Array
  type:   string
}

// ─── SMTP credentials ─────────────────────────────────────────────────────────

export interface SmtpCredentials {
  host: string
  port: number
  user: string
  pass: string
}