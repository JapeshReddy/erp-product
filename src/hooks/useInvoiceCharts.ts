import { useState, useEffect } from 'react'
import {
  fetchInvoiceTrend,
  fetchVendorSpend,
  fetchApprovalDistribution,
} from '@/services/dashboardService'
import type { TrendPoint, VendorSpend, ApprovalDistribution } from '@/types/dashboard'

export function useInvoiceCharts(clientId: string | undefined) {
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [vendorSpend, setVendorSpend] = useState<VendorSpend[]>([])
  const [distribution, setDistribution] = useState<ApprovalDistribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      try {
        const [t, v, d] = await Promise.all([
          fetchInvoiceTrend(clientId),
          fetchVendorSpend(clientId),
          fetchApprovalDistribution(clientId),
        ])
        if (!cancelled) {
          setTrend(t)
          setVendorSpend(v)
          setDistribution(d)
        }
      } catch {
        if (!cancelled) setError('Failed to load chart data')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [clientId])

  return { trend, vendorSpend, distribution, isLoading, error }
}