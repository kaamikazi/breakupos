import { z } from 'zod'
import { REPORT_REASON_VALUES, REPORT_STATUS_VALUES, VERIFICATION_STATUS_VALUES } from '@/lib/dating'

export const onboardingStepSchema = z.object({
  step: z.number().int().min(1).max(5),
})

export function getVerificationBadge(status: string | null | undefined) {
  const safe = VERIFICATION_STATUS_VALUES.includes(status as (typeof VERIFICATION_STATUS_VALUES)[number])
    ? status
    : 'unverified'
  if (safe === 'verified') return { label: 'Verified', tone: 'success' as const }
  if (safe === 'pending') return { label: 'Verification pending', tone: 'warning' as const }
  if (safe === 'rejected') return { label: 'Verification rejected', tone: 'danger' as const }
  return { label: 'Unverified', tone: 'neutral' as const }
}

export function filterAdminReports<T extends { status: string; reason: string }>(
  reports: T[],
  filters: { status?: string; reason?: string }
) {
  return reports.filter(report => {
    if (filters.status && filters.status !== 'all' && report.status !== filters.status) return false
    if (filters.reason && filters.reason !== 'all' && report.reason !== filters.reason) return false
    return true
  })
}

export function isReportStatus(value: string) {
  return REPORT_STATUS_VALUES.includes(value as (typeof REPORT_STATUS_VALUES)[number])
}

export function isReportReason(value: string) {
  return REPORT_REASON_VALUES.includes(value as (typeof REPORT_REASON_VALUES)[number])
}
