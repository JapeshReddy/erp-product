export function log(
  requestId: string,
  stage: string,
  data: Record<string, unknown> = {}
) {
  console.log(JSON.stringify({
    request_id: requestId,
    stage,
    timestamp: new Date().toISOString(),
    ...data,
  }))
}

export function logError(
  requestId: string,
  stage: string,
  error: unknown,
  extra: Record<string, unknown> = {}
) {
  console.error(JSON.stringify({
    request_id: requestId,
    stage,
    timestamp: new Date().toISOString(),
    error: error instanceof Error
      ? error.message
      : typeof error === 'object'
        ? JSON.stringify(error)
        : String(error),
    ...extra,
  }))
}