import { useState, useEffect } from 'react'
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
  const [data, setData] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const result = await fetchRecentActivity(clientId)
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setError('Failed to load activity')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [clientId])

  return { data, isLoading, error }
}

// ─── Security ─────────────────────────────────────────────────────────────────

export function useSecurityData(clientId: string | undefined) {
  const [data, setData] = useState<SecurityAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const result = await fetchSecurityAlerts(clientId)
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setError('Failed to load security data')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [clientId])

  return { data, isLoading, error }
}

// ─── Email Monitoring ─────────────────────────────────────────────────────────

export function useEmailMonitoring(clientId: string | undefined) {
  const [data, setData] = useState<EmailLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const result = await fetchEmailLogs(clientId)
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setError('Failed to load email logs')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [clientId])

  return { data, isLoading, error }
}

// ─── User Overview ────────────────────────────────────────────────────────────

export function useUserOverview(clientId: string | undefined) {
  const [data, setData] = useState<RoleCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const result = await fetchUserRoles(clientId)
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setError('Failed to load user data')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [clientId])

  return { data, isLoading, error }
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export function useAuditLogs(clientId: string | undefined) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const result = await fetchAuditLogs(clientId)
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setError('Failed to load audit logs')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [clientId])

  return { data, isLoading, error }
}