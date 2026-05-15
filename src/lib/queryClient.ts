import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 60 seconds — no redundant refetches on tab focus
      staleTime:          60_000,
      // Keep unused cache for 5 minutes to support back-navigation
      gcTime:             5 * 60_000,
      // One retry on failure before showing error
      retry:              1,
      retryDelay:         (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      // Don't auto-refetch on window focus — avoids disruptive reloads mid-task
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
