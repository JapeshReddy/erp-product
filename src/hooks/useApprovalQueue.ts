import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchApprovalQueue } from '@/services/dashboardService'
import type { ApprovalQueueRow } from '@/types/dashboard'

interface ApprovalQueueResult {
  data:  ApprovalQueueRow[]
  total: number
}

export function useApprovalQueue(clientId: string | undefined, pageSize = 10) {
  const [page, setPage] = useState(0)

  const { data: result, isLoading, error, refetch } = useQuery<ApprovalQueueResult>({
    queryKey: ['approval-queue', clientId, page, pageSize],
    queryFn:  () => fetchApprovalQueue(clientId!, page, pageSize),
    enabled:  !!clientId,
    staleTime: 30_000,
  })

  return {
    data:      result?.data  ?? [],
    total:     result?.total ?? 0,
    page,
    setPage,
    pageSize,
    isLoading,
    error:     error ? (error as Error).message : null,
    refresh:   refetch,
  }
}
