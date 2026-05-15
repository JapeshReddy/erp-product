import { useQuery } from '@tanstack/react-query'
import { fetchKpis } from '@/services/dashboardService'
import type { KpiData } from '@/types/dashboard'

export function useDashboardKpis(clientId: string | undefined) {
  const { data, isLoading, error } = useQuery<KpiData>({
    queryKey:        ['kpis', clientId],
    queryFn:         () => fetchKpis(clientId!),
    enabled:         !!clientId,
    staleTime:       30_000,
    refetchInterval: 60_000, // background refresh every minute
  })

  return {
    data:      data ?? null,
    isLoading,
    error:     error ? (error as Error).message : null,
  }
}
