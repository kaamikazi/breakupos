'use client'

import { useState } from 'react'
import { differenceInDays, format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Interaction, Situation } from '@/types'
import { toast } from 'sonner'

interface NoContactPanelProps {
  situation: Situation
  interactions: Interaction[]
  onSituationUpdate: (updates: Partial<Situation>) => Promise<void>
  onInteractionAdded?: (interaction: Interaction) => void
}

const DEFAULT_MILESTONES = ['24 hours', '3 days', '1 week', '2 weeks', '30 days', '60 days', '90 days']

export function NoContactPanel({
  situation,
  interactions,
  onSituationUpdate,
  onInteractionAdded,
}: NoContactPanelProps) {
  const [reason, setReason] = useState('')
  const [milestone, setMilestone] = useState('')
  const [relapseNote, setRelapseNote] = useState('')
  const [emergencyOpen, setEmergencyOpen] = useState(false)

  const noContactStarted = situation.no_contact_started ?? null
  const streak = noContactStarted ? Math.max(0, differenceInDays(new Date(), parseISO(noContactStarted))) : 0
  const relapses = interactions.filter(i => i.type === 'relapse')
  const reasons = situation.no_contact_reasons ?? []
  const milestones = situation.recovery_milestones ?? []
  const nextMilestone = DEFAULT_MILESTONES.find(item => !milestones.includes(item)) ?? 'Keep choosing peace'

  const startNoContact = async () => {
    await onSituationUpdate({
      is_breakup_mode: true,
      stage: 'no_contact',
      no_contact_started: new Date().toISOString().split('T')[0],
    })
    toast.success('No-contact mode started. One sane day at a time.')
  }

  const addReason = async () => {
    if (!reason.trim()) return
    await onSituationUpdate({ no_contact_reasons: [reason.trim(), ...reasons] })
    setReason('')
  }

  const addMilestone = async (value = milestone) => {
    if (!value.trim()) return
    await onSituationUpdate({ recovery_milestones: [value.trim(), ...milestones] })
    setMilestone('')
  }

  const logRelapse = async () => {
    const res = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        situation_id: situation.id,
        type: 'relapse',
        sentiment: 'negative',
        note: relapseNote || 'Contact relapse logged',
        date: new Date().toISOString().split('T')[0],
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Could not log relapse')
      return
    }
    onInteractionAdded?.(data)
    setRelapseNote('')
    toast.success('Logged. Reset does not mean ruined.')
  }

  return (
    <div className="space-y-5">
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">No-Contact Mode</h3>
            <p className="text-sm text-emerald-100/80 mt-1">
              The goal is not to win the breakup. The goal is to get your nervous system back.
            </p>
          </div>
          {noContactStarted ? (
            <div className="text-right">
              <div className="text-4xl font-bold text-white">{streak}</div>
              <div className="text-xs text-emerald-200">day streak since {format(parseISO(noContactStarted), 'MMM d')}</div>
            </div>
          ) : (
            <Button onClick={startNoContact} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              Start No Contact
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Emergency Screen</h3>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/40 text-red-300 hover:bg-red-500/10"
              onClick={() => setEmergencyOpen(v => !v)}
            >
              Do Not Text
            </Button>
          </div>
          {emergencyOpen && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-3">
              <p className="text-sm text-red-100">
                Wait 20 minutes. Drink water. Send the message to a notes app, not to them. The urge will peak and pass.
              </p>
              <ul className="space-y-1 text-sm text-zinc-300">
                {(reasons.length ? reasons.slice(0, 4) : ['They already showed you the pattern.', 'Silence is data.', 'Peace is better than a dopamine spike.']).map(item => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Reason to stay no-contact</label>
            <div className="flex gap-2">
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Because I deserve consistency."
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <Button onClick={addReason} className="bg-pink-500 hover:bg-pink-600 text-white">Add</Button>
            </div>
          </div>
          <div className="space-y-2">
            {reasons.length === 0 ? (
              <p className="text-sm text-zinc-500">Add reasons for your future self. Future you has excellent taste.</p>
            ) : reasons.map(item => (
              <div key={item} className="text-sm text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-md p-2">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Relapse Log</h3>
          <Textarea
            value={relapseNote}
            onChange={e => setRelapseNote(e.target.value)}
            placeholder="What happened, what triggered it, and what will help next time?"
            className="bg-zinc-800 border-zinc-700 text-white min-h-[96px]"
          />
          <Button onClick={logRelapse} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Log Relapse
          </Button>
          <div className="space-y-2">
            {relapses.length === 0 ? (
              <p className="text-sm text-zinc-500">No relapses logged. Keep it boring. Boring is healing.</p>
            ) : relapses.map(item => (
              <div key={item.id} className="text-sm text-zinc-300 border border-zinc-800 rounded-md p-2">
                <span className="text-zinc-500">{format(parseISO(item.date), 'MMM d')}:</span> {item.note}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Recovery Milestones</h3>
            <p className="text-xs text-zinc-500">Next suggested milestone: {nextMilestone}</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={milestone}
              onChange={e => setMilestone(e.target.value)}
              placeholder="Custom milestone"
              className="bg-zinc-800 border-zinc-700 text-white h-9"
            />
            <Button size="sm" onClick={() => addMilestone()} className="bg-pink-500 hover:bg-pink-600 text-white">Add</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_MILESTONES.map(item => (
            <Button
              key={item}
              size="sm"
              variant="outline"
              disabled={milestones.includes(item)}
              onClick={() => addMilestone(item)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              {milestones.includes(item) ? `Done: ${item}` : item}
            </Button>
          ))}
        </div>
        {milestones.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {milestones.map(item => (
              <div key={item} className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2">
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
