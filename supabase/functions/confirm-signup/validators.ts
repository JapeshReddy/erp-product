export function extractJwt(authHeader: string): string | null {
  if (!authHeader.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '').trim()
  return token || null
}

export function validateUserId(userId: unknown): string | null {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return null
  return userId.trim()
}