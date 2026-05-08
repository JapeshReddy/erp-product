import type { ReviewPayload } from './types.ts'

const VALID_ROLES = ['ADMIN', 'ALL_ACCESS', 'CREATE', 'READ']
const VALID_ACTIONS = ['APPROVE', 'REJECT']

export function validatePayload(body: unknown): {
  valid: boolean
  error?: string
  data?: ReviewPayload
} {
  if (!body || typeof body !== 'object')
    return { valid: false, error: 'Invalid request body.' }

  const b = body as Record<string, unknown>

  if (!b.requestId || typeof b.requestId !== 'string' || !b.requestId.trim())
    return { valid: false, error: 'requestId is required.' }

  if (!b.action || !VALID_ACTIONS.includes(b.action as string))
    return { valid: false, error: 'action must be APPROVE or REJECT.' }

  if (b.action === 'APPROVE') {
    if (!Array.isArray(b.roles) || b.roles.length === 0)
      return { valid: false, error: 'At least one role is required for approval.' }

    for (const role of b.roles) {
      if (!VALID_ROLES.includes(role))
        return { valid: false, error: `Invalid role: ${role}` }
    }
  }

  if (b.action === 'REJECT') {
    if (!b.reason || typeof b.reason !== 'string' || b.reason.trim().length < 10)
      return { valid: false, error: 'Rejection reason must be at least 10 characters.' }

    if (b.reason.trim().length > 500)
      return { valid: false, error: 'Rejection reason must not exceed 500 characters.' }
  }

  return {
    valid: true,
    data: {
      requestId: b.requestId.trim(),
      action: b.action as 'APPROVE' | 'REJECT',
      roles: b.roles as string[] | undefined,
      reason: typeof b.reason === 'string' ? b.reason.trim() : undefined,
    },
  }
}