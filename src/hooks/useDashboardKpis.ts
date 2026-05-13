import { useState, useEffect } from 'react'
import { fetchKpis } from '@/services/dashboardService'
import type { KpiData } from '@/types/dashboard'

export function useDashboardKpis(clientId: string | undefined) {
  const [data, setData] = useState<KpiData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchKpis(clientId)
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setError('Failed to load KPIs')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 60_000) // refresh every 60s
    return () => { cancelled = true; clearInterval(interval) }
  }, [clientId])

  return { data, isLoading, error }
}