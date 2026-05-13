import { useState, useEffect, useCallback } from 'react'
import type { AccessRequest, RequestReviewPayload, ReviewResponse } from '@/types/admin'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

async function fetchWithProductSchema(path: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept-Profile': 'product',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })
  if (!response.ok) return null
  return response.json()
}

export function useAccessRequest(requestId: string | undefined) {
  const [request, setRequest]         = useState<AccessRequest | null>(null)
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string } | null>(null)
  const [orgName, setOrgName]         = useState<string>('')
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const fetchRequest = useCallback(async () => {
    if (!requestId) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch access request
      const arData = await fetchWithProductSchema(
        `access_requests?id=eq.${requestId}&select=*&limit=1`
      )

      if (!arData || arData.length === 0) {
        setError('Access request not found.')
        return
      }

      const ar = arData[0] as AccessRequest
      setRequest(ar)

      setUserProfile({
        full_name: ar.requested_email,
        email: ar.requested_email,
      })

      // Fetch org name
      const orgData = await fetchWithProductSchema(
        `clients?id=eq.${ar.client_id}&select=name&limit=1`
      )

      if (orgData && orgData.length > 0) {
        setOrgName(orgData[0].name)
      } else {
        setOrgName(ar.client_id)
      }

    } catch {
      setError('Failed to load access request.')
    } finally {
      setIsLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    fetchRequest()
  }, [fetchRequest])

  return { request, userProfile, orgName, isLoading, error, refetch: fetchRequest }
}

export async function submitReview(
  payload: RequestReviewPayload
): Promise<ReviewResponse> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/review-access-request`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    }
  )

  let data: ReviewResponse
  try {
    data = await response.json()
  } catch {
    return { success: false, code: 'PARSE_ERROR', message: 'Invalid response from server.' }
  }

  if (!response.ok) {
    return {
      success: false,
      code: data?.code ?? 'REQUEST_FAILED',
      message: data?.message ?? 'Something went wrong.',
    }
  }

  return data
}
