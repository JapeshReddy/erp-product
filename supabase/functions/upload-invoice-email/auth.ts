import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── resolveUserEmail ──────────────────────────────────────────────────────────

export async function resolveUserEmail(
  req: Request
): Promise<{ email: string; userId: string } | null> {

  console.log('[AUTH] Starting resolveUserEmail')

  const authHeader = req.headers.get('Authorization') ?? ''

  console.log('[AUTH] Authorization header exists:', !!authHeader)

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  console.log('[AUTH] Token exists:', !!token)

  if (!token) {

    console.error('[AUTH] Missing token')

    return null
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  console.log('[AUTH] SUPABASE_URL exists:', !!supabaseUrl)
  console.log('[AUTH] SERVICE_ROLE_KEY exists:', !!serviceRoleKey)

  let supabase

  try {

    console.log('[AUTH] Creating Supabase client')

    supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('[AUTH] Supabase client created')

  } catch (err) {

    console.error('[AUTH] Failed creating Supabase client:', err)

    return null
  }

  let result

  try {

    console.log('[AUTH] Calling auth.getUser')

    result = await supabase.auth.getUser(token)

    console.log('[AUTH] auth.getUser completed')

  } catch (err) {

    console.error('[AUTH] auth.getUser crashed:', err)

    return null
  }

  const { data, error } = result

  if (error) {

    console.error('[AUTH] getUser returned error:', error)

    return null
  }

  if (!data?.user) {

    console.error('[AUTH] No user found')

    return null
  }

  const email = data.user.email

  console.log('[AUTH] User ID:', data.user.id)
  console.log('[AUTH] User email exists:', !!email)

  if (!email) {

    console.error('[AUTH] User email missing')

    return null
  }

  console.log('[AUTH] Authentication successful')

  return {
    email,
    userId: data.user.id
  }
}