export interface ApiResponse<T = unknown> {
  success: boolean
  code: string
  message: string
  data?: T
  error?: string
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function respond<T>(body: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS })
}

export function success<T>(code: string, message: string, data: T): Response {
  return respond<T>({ success: true, code, message, data })
}

export function failure(code: string, message: string, error?: string, status = 400): Response {
  return respond({ success: false, code, message, error }, status)
}

export function corsPreflightResponse(): Response {
  return new Response('ok', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  })
}