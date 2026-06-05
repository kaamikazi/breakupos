'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DATING_LABELS, REPORT_REASON_VALUES, REPORT_STATUS_VALUES } from '@/lib/dating'
import { filterAdminReports } from '@/lib/dating-beta'
import type { ReportStatus } from '@/types'

export type AdminReport = {
  id: string
  reporter_user_id: string
  reported_user_id: string
  reason: keyof typeof DATING_LABELS.reportReason
  details: string
  status: ReportStatus
  internal_notes: string
  created_at: string
  reviewed_at: string | null
  reported_verification_status?: string | null
}

export function AdminReportsClient({ initialReports }: { initialReports: AdminReport[] }) {
  const [reports, setReports] = useState(initialReports)
  const [statusFilter, setStatusFilter] = useState('all')
  const [reasonFilter, setReasonFilter] = useState('all')
  const visibleReports = useMemo(
    () => filterAdminReports(reports, { status: statusFilter, reason: reasonFilter }),
    [reports, statusFilter, reasonFilter]
  )

  const updateReport = async (id: string, status: ReportStatus, internal_notes: string, block_reported_user = false) => {
    const response = await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, internal_notes, block_reported_user }),
    })
    if (!response.ok) {
      toast.error('Could not update report')
      return
    }
    const updated = await response.json()
    setReports(current => current.map(report => report.id === id ? updated : report))
    toast.success(block_reported_user ? 'Report updated and user blocked for reporter' : 'Report updated')
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:flex-row">
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
          <option value="all">All statuses</option>
          {REPORT_STATUS_VALUES.map(item => <option key={item} value={item}>{DATING_LABELS.reportStatus[item]}</option>)}
        </select>
        <select value={reasonFilter} onChange={event => setReasonFilter(event.target.value)} className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
          <option value="all">All categories</option>
          {REPORT_REASON_VALUES.map(item => <option key={item} value={item}>{DATING_LABELS.reportReason[item]}</option>)}
        </select>
      </div>

      {visibleReports.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-400">No reports match the current filters.</div>
      ) : visibleReports.map(report => (
        <article key={report.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
            <div className="space-y-2">
              <div className="text-sm text-zinc-400">Report ID: {report.id}</div>
              <h2 className="text-lg font-semibold text-white">{DATING_LABELS.reportReason[report.reason] ?? report.reason}</h2>
              <p className="text-sm text-zinc-300">{report.details || 'No details provided.'}</p>
              <div className="grid gap-1 text-xs text-zinc-500">
                <span>Reporter: {report.reporter_user_id}</span>
                <span>Reported: {report.reported_user_id}</span>
                <span>Status: {DATING_LABELS.reportStatus[report.status]}</span>
                <span>Reported verification: {report.reported_verification_status ?? 'unknown'}</span>
                <span>Created: {new Date(report.created_at).toLocaleString()}</span>
                {report.reviewed_at && <span>Reviewed: {new Date(report.reviewed_at).toLocaleString()}</span>}
              </div>
            </div>
            <ReportUpdater report={report} onUpdate={updateReport} />
          </div>
        </article>
      ))}
    </div>
  )
}

function ReportUpdater({ report, onUpdate }: { report: AdminReport; onUpdate: (id: string, status: ReportStatus, notes: string, block: boolean) => Promise<void> }) {
  const [status, setStatus] = useState<ReportStatus>(report.status)
  const [notes, setNotes] = useState(report.internal_notes)
  const [block, setBlock] = useState(false)
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-3">
      <select value={status} onChange={event => setStatus(event.target.value as ReportStatus)} className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100">
        {REPORT_STATUS_VALUES.map(item => <option key={item} value={item}>{DATING_LABELS.reportStatus[item]}</option>)}
      </select>
      <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Internal moderation notes" className="min-h-24 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
      <label className="flex items-start gap-2 text-xs text-zinc-300">
        <input type="checkbox" checked={block} onChange={event => setBlock(event.target.checked)} className="mt-0.5" />
        Block reported user for the reporter
      </label>
      <Button onClick={async () => {
        setSaving(true)
        await onUpdate(report.id, status, notes, block)
        setSaving(false)
      }} disabled={saving} className="w-full bg-zinc-100 text-zinc-950 hover:bg-white">
        {saving ? 'Saving...' : 'Update status'}
      </Button>
    </div>
  )
}
