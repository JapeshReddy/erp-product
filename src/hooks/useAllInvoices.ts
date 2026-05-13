import { useState, useEffect, useCallback } from 'react'
import { fetchInvoices, fetchVendors, fetchCurrencies } from '@/services/invoiceService'
import type { InvoiceRow, InvoiceFilters, PaginatedInvoices } from '@/types/invoice'

const DEFAULT_FILTERS: InvoiceFilters = {
  search: '',
  vendor: '',
  approvalStatus: 'ALL',
  dateRange: 'THIS_MONTH',
  customFrom: '',
  customTo: '',
  poNumber: '',
  currency: '',
}

const PAGE_SIZE = 10

export function useAllInvoices(clientId: string | undefined) {
  const [data,      setData]      = useState<InvoiceRow[]>([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(0)
  const [filters,   setFilters]   = useState<InvoiceFilters>(DEFAULT_FILTERS)
  const [vendors,   setVendors]   = useState<string[]>([])
  const [currencies,setCurrencies]= useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // Load filter options once
  useEffect(() => {
    if (!clientId) return
    fetchVendors(clientId).then(setVendors)
    fetchCurrencies(clientId).then(setCurrencies)
  }, [clientId])

  const load = useCallback(async () => {
    if (!clientId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchInvoices(clientId, filters, page, PAGE_SIZE)
      setData(result.data)
      setTotal(result.total)
    } catch {
      setError('Failed to load invoices')
    } finally {
      setIsLoading(false)
    }
  }, [clientId, filters, page])

  useEffect(() => { load() }, [load])

  const updateFilter = useCallback((key: keyof InvoiceFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPage(0)
  }, [])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return {
    data, total, page, setPage, totalPages, PAGE_SIZE,
    filters, updateFilter, resetFilters,
    vendors, currencies,
    isLoading, error, refresh: load,
  }
}