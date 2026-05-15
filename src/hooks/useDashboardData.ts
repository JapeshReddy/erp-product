import { useQuery } from '@tanstack/react-query'
import {
  fetchRecentActivity,
  fetchSecurityAlerts,
  fetchEmailLogs,
  fetchUserRoles,
  fetchAuditLogs,
} from '@/services/dashboardService'
import type { ActivityItem, SecurityAlert, EmailLog, RoleCount } from '@/types/dashboard'

// ─── Recent Activity ──────────────────────────────────────────────────────────

export function useRecentActivity(clientId: string | undefined) {
  const { data, isLoading, error } = useQuery<ActivityItem[]>({
    queryKey:        ['activity', clientId],
    queryFn:         () => fetchRecentActivity(clientId!),
    enabled:         !!clientId,
    staleTime:       15_000,
    refetchInterval: 30_000,
  })

  return { data: data ?? [], isLoading, error: error ? (error as Error).message : null }
}

// ─── Security ─────────────────────────────────────────────────────────────────

export function useSecurityData(clientId: string | undefined) {
  const { data, isLoading, error } = useQuery<SecurityAlert[]>({
    queryKey:  ['security', clientId],
    queryFn:   () => fetchSecurityAlerts(clientId!),
    enabled:   !!clientId,
    staleTime: 60_000,
  })

  return { data: data ?? [], isLoading, error: error ? (error as Error).message : null }
}

// ─── Email Monitoring ─────────────────────────────────────────────────────────

export function useEmailMonitoring(clientId: string | undefined) {
  const { data, isLoading, error } = useQuery<EmailLog[]>({
    queryKey:  ['email-logs', clientId],
    queryFn:   () => fetchEmailLogs(clientId!),
    enabled:   !!clientId,
    staleTime: 60_000,
  })

  return { data: data ?? [], isLoading, error: error ? (error as Error).message : null }
}

// ─── User Overview ────────────────────────────────────────────────────────────

export function useUserOverview(clientId: string | undefined) {
  const { data, isLoading, error } = useQuery<RoleCount[]>({
    queryKey:  ['user-roles', clientId],
    queryFn:   () => fetchUserRoles(clientId!),
    enabled:   !!clientId,
    staleTime: 5 * 60_000,
  })

  return { data: data ?? [], isLoading, error: error ? (error as Error).message : null }
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export function useAuditLogs(clientId: string | undefined) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error } = useQuery<any[]>({
    queryKey:  ['audit-logs', clientId],
    queryFn:   () => fetchAuditLogs(clientId!),
    enabled:   !!clientId,
    staleTime: 60_000,
  })

  return { data: data ?? [], isLoading, error: error ? (error as Error).message : null }
}
