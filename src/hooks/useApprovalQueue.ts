import { useState, useEffect, useCallback } from 'react'
import { fetchApprovalQueue } from '@/services/dashboardService'
import type { ApprovalQueueRow } from '@/types/dashboard'

export function useApprovalQueue(clientId: string | undefined, pageSize = 10) {
  const [data, setData] = useState<ApprovalQueueRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!clientId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchApprovalQueue(clientId, page, pageSize)
      setData(result.data)
      setTotal(result.total)
    } catch {
      setError('Failed to load approval queue')
    } finally {
      setIsLoading(false)
    }
  }, [clientId, page, pageSize])

  useEffect(() => { load() }, [load])

  return { data, total, page, setPage, pageSize, isLoading, error, refresh: load }
}