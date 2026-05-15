import { useState, useCallback, useRef } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchInvoices, fetchVendors, fetchCurrencies } from '@/services/invoiceService'
import type { InvoiceFilters } from '@/types/invoice'

const DEFAULT_FILTERS: InvoiceFilters = {
  search:         '',
  vendor:         '',
  approvalStatus: 'ALL',
  dateRange:      'THIS_MONTH',
  customFrom:     '',
  customTo:       '',
  poNumber:       '',
  currency:       '',
}

export const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 320

export function useAllInvoices(clientId: string | undefined) {
  const [page,    setPage]    = useState(0)
  const [filters, setFilters] = useState<InvoiceFilters>(DEFAULT_FILTERS)

  // Debounce search separately so non-search filter changes are instant
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateFilter = useCallback((key: keyof InvoiceFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)

    if (key === 'search') {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), SEARCH_DEBOUNCE_MS)
    }
  }, [])

  const resetFilters = useCallback(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    setFilters(DEFAULT_FILTERS)
    setDebouncedSearch('')
    setPage(0)
  }, [])

  const effectiveFilters: InvoiceFilters = { ...filters, search: debouncedSearch }

  // Invoices — keepPreviousData removes pagination flicker (old data shown while next page loads)
  const {
    data: invoiceData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invoices', clientId, page, effectiveFilters] as const,
    queryFn:  () => fetchInvoices(clientId!, effectiveFilters, page, PAGE_SIZE),
    enabled:  !!clientId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  // Vendor + currency filter options — fetched once and cached
  const { data: vendors } = useQuery<string[]>({
    queryKey: ['invoice-vendors', clientId],
    queryFn:  () => fetchVendors(clientId!),
    enabled:  !!clientId,
    staleTime: 5 * 60_000,
  })

  const { data: currencies } = useQuery<string[]>({
    queryKey: ['invoice-currencies', clientId],
    queryFn:  () => fetchCurrencies(clientId!),
    enabled:  !!clientId,
    staleTime: 5 * 60_000,
  })

  const total      = invoiceData?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return {
    data:       invoiceData?.data ?? [],
    total,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
    filters,
    updateFilter,
    resetFilters,
    vendors:    vendors    ?? [],
    currencies: currencies ?? [],
    isLoading,
    error:      error ? (error as Error).message : null,
    refresh:    refetch,
  }
}
