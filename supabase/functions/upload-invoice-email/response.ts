import type { UploadResponse, ErrorCode } from './types.ts'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Content-Type':                 'application/json',
}

export function corsPreflightResponse(): Response {

  console.log('[CORS] Preflight request received')

  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  })
}

export function successResponse(
  data: UploadResponse['data']
): Response {

  console.log('[RESPONSE] Success response triggered')
  console.log('[RESPONSE] Data:', data)

  const body: UploadResponse = {
    success: true,
    code:    'UPLOAD_SUCCESS',
    message: 'Invoice sent via email successfully.',
    data,
  }

  console.log('[RESPONSE] Returning 200 response')

  return new Response(
    JSON.stringify(body),
    {
      status: 200,
      headers: CORS_HEADERS
    }
  )
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: string,
  status = 400
): Response {

  console.error('━━━━━━━━ ERROR RESPONSE ━━━━━━━━')
  console.error('[ERROR] Code:', code)
  console.error('[ERROR] Message:', message)
  console.error('[ERROR] Details:', details)
  console.error('[ERROR] Status:', status)
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const body: UploadResponse = {
    success: false,
    code,
    message,
    ...(details ? { error: details } : {}),
  }

  console.log('[RESPONSE] Returning error response')

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: CORS_HEADERS
    }
  )
}