'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/shared/InlineAlert'
import { PlanGate } from '@/components/shared/PlanGate'
import type { WeeklySummary } from '@/types'
import { toast } from 'sonner'

interface WeeklySummaryWidgetProps {
  initialSummary: WeeklySummary | null
  isPro: boolean
}

export function WeeklySummaryWidget({ initialSummary, isPro }: WeeklySummaryWidgetProps) {
  const [summary, setSummary] = useState<WeeklySummary | null>(initialSummary)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/weekly-summary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not generate weekly summary')
        return
      }
      setSummary(data)
      toast.success('Weekly coach summary generated')
    } catch {
      toast.error('Weekly summary unavailable right now')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PlanGate isPro={isPro} feature="Weekly AI Coach Summary">
      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Weekly AI Coach Summary</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Manual generation for now. TODO: connect this to Vercel Cron or a scheduled function.
            </p>
          </div>
          <Button onClick={generate} disabled={loading} className="bg-pink-500 text-white hover:bg-pink-600">
            {loading ? 'Generating...' : 'Generate weekly summary'}
          </Button>
        </div>

        {!summary ? (
          <InlineAlert tone="info" className="mt-4">
            No weekly summary generated yet. Create one after logging a few interactions this week.
          </InlineAlert>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 lg:col-span-3">
              <p className="text-sm text-zinc-300">{summary.summary}</p>
            </div>
            {[
              ['Emotional trend', summary.emotional_trend],
              ['Biggest red flag', summary.biggest_red_flag],
              ['Healthiest connection', summary.healthiest_connection],
              ['Most draining', summary.most_draining_situation],
              ['No-contact progress', summary.no_contact_progress],
              ['Next focus', summary.suggested_focus],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="mb-1 text-xs text-zinc-500">{label}</div>
                <div className="text-sm text-zinc-200">{value}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PlanGate>
  )
}
