import { useState, useEffect, useRef, useCallback } from 'react'
import type { Organization } from '@/types/auth'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface LookupState {
  organizations: Organization[]
  isLoading: boolean
  error: string | null
  hasFetched: boolean
}

const cache = new Map<string, Organization[]>()

async function fetchOrganizationsByDomain(domain: string): Promise<Organization[]> {
  const url = `${SUPABASE_URL}/rest/v1/clients?select=id,name,allowed_email_domains&status=eq.ACTIVE`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept-Profile': 'product',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`[OrgLookup] API error ${response.status}:`, text)
    throw new Error(`Request failed with status ${response.status}`)
  }

  const data: Organization[] = await response.json()

  return data.filter((client) =>
    client.allowed_email_domains?.some(
      (d: string) => d.trim().toLowerCase() === domain
    )
  )
}

export function useOrganizationLookup(email: string, enabled: boolean) {
  const [state, setState] = useState<LookupState>({
    organizations: [],
    isLoading: false,
    error: null,
    hasFetched: false,
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDomainRef = useRef<string>('')

  const extractDomain = useCallback((e: string) => {
    const parts = e.trim().toLowerCase().split('@')
    return parts.length === 2 && parts[1].includes('.') ? parts[1] : null
  }, [])

  useEffect(() => {
    if (!enabled) {
      setState({ organizations: [], isLoading: false, error: null, hasFetched: false })
      lastDomainRef.current = ''
      return
    }

    const domain = extractDomain(email)
    if (!domain) return
    if (domain === lastDomainRef.current) return

    setState(prev => ({ ...prev, organizations: [], hasFetched: false, error: null }))

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      lastDomainRef.current = domain

      if (cache.has(domain)) {
        setState({
          organizations: cache.get(domain)!,
          isLoading: false,
          error: null,
          hasFetched: true,
        })
        return
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const matched = await fetchOrganizationsByDomain(domain)
        cache.set(domain, matched)
        setState({ organizations: matched, isLoading: false, error: null, hasFetched: true })
      } catch (err) {
        console.error('[OrgLookup] Failed to fetch organizations:', err)
        setState({
          organizations: [],
          isLoading: false,
          error: 'Failed to load organizations. Please try again.',
          hasFetched: true,
        })
      }
    }, 600)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [email, enabled, extractDomain])

  return state
}