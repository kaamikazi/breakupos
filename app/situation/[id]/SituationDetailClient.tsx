'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { differenceInDays, parseISO, format } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CompatibilityRing } from '@/components/shared/CompatibilityRing'
import { StageBadge } from '@/components/shared/StageBadge'
import { HeartMeter } from '@/components/shared/HeartMeter'
import { FlagManager } from '@/components/Situation/FlagManager'
import { InteractionLog } from '@/components/Situation/InteractionLog'
import { VibeSelector } from '@/components/Situation/VibeSelector'
import { AdvisorChat } from '@/components/Advisor/AdvisorChat'
import { CompatibilityBreakdown } from '@/components/Situation/CompatibilityBreakdown'
import { NoContactPanel } from '@/components/Recovery/NoContactPanel'
import { SituationTimeline } from '@/components/Situation/SituationTimeline'
import { GenerateReportButton } from '@/components/Reports/GenerateReportButton'
import { STAGES, VIBE_COLORS } from '@/types'
import type { Situation, Interaction, AIAdvice, Profile, Stage, Vibe } from '@/types'
import { toast } from 'sonner'
import { useDebounceValue } from 'usehooks-ts'
import { useEffect, useRef } from 'react'

interface SituationDetailClientProps {
  situation: Situation
  interactions: Interaction[]
  advice: AIAdvice[]
  profile: Profile
}

export function SituationDetailClient({
  situation: initialSituation,
  interactions: initialInteractions,
  advice,
  profile,
}: SituationDetailClientProps) {
  const router = useRouter()
  const [situation, setSituation] = useState(initialSituation)
  const [interactions, setInteractions] = useState(initialInteractions)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notes, setNotes] = useState(initialSituation.notes ?? '')
  const [vault, setVault] = useState(initialSituation.private_vault ?? '')
  const [debouncedNotes] = useDebounceValue(notes, 500)
  const [debouncedVault] = useDebounceValue(vault, 700)
  const isFirstNotesRender = useRef(true)
  const isFirstVaultRender = useRef(true)

  // Autosave notes
  useEffect(() => {
    if (isFirstNotesRender.current) {
      isFirstNotesRender.current = false
      return
    }
    const save = async () => {
      setSaving(true)
      try {
        await fetch(`/api/situations/${situation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: debouncedNotes }),
        })
      } finally {
        setSaving(false)
      }
    }
    save()
  }, [debouncedNotes, situation.id])

  useEffect(() => {
    if (isFirstVaultRender.current) {
      isFirstVaultRender.current = false
      return
    }
    const save = async () => {
      setSaving(true)
      try {
        await fetch(`/api/situations/${situation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ private_vault: debouncedVault }),
        })
      } finally {
        setSaving(false)
      }
    }
    save()
  }, [debouncedVault, situation.id])

  const updateSituation = useCallback(async (updates: Partial<Situation>) => {
    setSituation(prev => ({ ...prev, ...updates }))
    try {
      const res = await fetch(`/api/situations/${situation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setSituation(updated)
    } catch {
      toast.error('Failed to save')
    }
  }, [situation.id])

  const updateSituationAsync = useCallback(async (updates: Partial<Situation>) => {
    return updateSituation(updates)
  }, [updateSituation])

  const handleDelete = async () => {
    if (!confirm(`Delete ${situation.name} permanently? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/situations/${situation.id}`, {
        method: 'DELETE',
        headers: { 'x-breakupos-confirm-delete': 'situation' },
      })
      if (!res.ok) throw new Error()
      toast.success('Situation deleted')
      router.push('/dashboard')
    } catch {
      toast.error('Failed to delete')
      setDeleting(false)
    }
  }

  const daysKnown = situation.first_contact
    ? differenceInDays(new Date(), parseISO(situation.first_contact))
    : null

  const vibeColor = VIBE_COLORS[situation.vibe as Vibe]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        <div className="flex items-start gap-4 flex-1">
          <div className="text-6xl">{situation.avatar_emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-3xl font-bold text-white sensitive-name">{situation.name}</h1>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: vibeColor }}
                title={`Vibe: ${situation.vibe}`}
              />
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <StageBadge stage={situation.stage as Stage} size="md" />
              <span className="text-sm text-zinc-500 capitalize">{situation.contact_method}</span>
            </div>
            <div className="flex gap-6 text-sm text-zinc-400">
              {situation.first_contact && (
                <div>
                  <span className="text-zinc-500">Since</span>{' '}
                  {format(parseISO(situation.first_contact), 'MMM d, yyyy')}
                </div>
              )}
              {daysKnown !== null && (
                <div><span className="text-zinc-500">Known</span> {daysKnown}d</div>
              )}
              <div><span className="text-zinc-500">Interactions</span> {interactions.length}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <HeartMeter value={situation.emotional_invest} size="md" />
            <p className="text-xs text-zinc-500 mt-1 text-center">Investment</p>
          </div>
          <CompatibilityRing score={situation.compatibility} size={90} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800">Overview</TabsTrigger>
          <TabsTrigger value="interactions" className="data-[state=active]:bg-zinc-800">Timeline</TabsTrigger>
          <TabsTrigger value="recovery" className="data-[state=active]:bg-zinc-800">Recovery</TabsTrigger>
          <TabsTrigger value="advisor" className="data-[state=active]:bg-zinc-800">AI Advisor</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-zinc-800">Settings</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stage selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Pipeline Stage</h3>
            <Select
              value={situation.stage}
              onValueChange={v => updateSituation({ stage: v as Stage })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {STAGES.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-white">
                    {s.emoji} {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vibe + Investment */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Vibe</h3>
              <VibeSelector
                value={situation.vibe as Vibe}
                onChange={vibe => updateSituation({ vibe })}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">
                Emotional Investment: {situation.emotional_invest}/10
              </h3>
              <input
                type="range"
                min={1}
                max={10}
                value={situation.emotional_invest}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  setSituation(prev => ({ ...prev, emotional_invest: v }))
                }}
                onMouseUp={e => updateSituation({ emotional_invest: parseInt((e.target as HTMLInputElement).value) })}
                className="w-full accent-pink-500"
              />
            </div>
          </div>

          {/* Flags */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <FlagManager
              redFlags={situation.red_flags ?? []}
              greenFlags={situation.green_flags ?? []}
              onUpdate={(red, green) => updateSituation({ red_flags: red, green_flags: green })}
            />
          </div>

          <CompatibilityBreakdown situation={situation} interactions={interactions} />

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Relationship Report</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  No report is shown here yet. Generate a Pro report to open a private printable summary in a new tab.
                </p>
              </div>
              <GenerateReportButton situationId={situation.id} isPro={profile.plan === 'pro'} />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Private Notes</h3>
              {saving && <span className="text-xs text-zinc-500">Saving...</span>}
            </div>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Your private thoughts. No one else sees this."
              className="bg-zinc-800 border-zinc-700 text-white text-sm resize-none min-h-[120px]"
              rows={5}
            />
          </div>
        </TabsContent>

        {/* Interactions tab */}
        <TabsContent value="interactions">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
            <InteractionLog
              situationId={situation.id}
              interactions={interactions}
              onUpdate={setInteractions}
            />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Calendar Timeline</h3>
            <SituationTimeline situation={situation} interactions={interactions} advice={advice} />
          </div>
        </TabsContent>

        <TabsContent value="recovery">
          <NoContactPanel
            situation={situation}
            interactions={interactions}
            onSituationUpdate={updateSituationAsync}
            onInteractionAdded={interaction => setInteractions(prev => [interaction, ...prev])}
          />
        </TabsContent>

        {/* Advisor tab */}
        <TabsContent value="advisor">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">AI Advisor</h3>
            <AdvisorChat
              situationId={situation.id}
              isPro={profile.plan === 'pro'}
              initialAdvice={advice}
            />
          </div>
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Danger Zone</h3>
            <p className="text-sm text-zinc-400">Actions here cannot be undone.</p>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-semibold text-white">Private Vault</h4>
              <p className="text-xs text-zinc-500">
                Pro positioning placeholder: store sensitive context here. TODO: encrypt before production-grade vault use.
              </p>
              <Textarea
                value={vault}
                onChange={e => setVault(e.target.value)}
                placeholder="Receipts, boundaries, reminders, or anything you need tucked away."
                className="bg-zinc-900 border-zinc-700 text-white text-sm min-h-[120px]"
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => updateSituation({
                  is_breakup_mode: true,
                  stage: 'no_contact',
                  no_contact_started: situation.no_contact_started ?? new Date().toISOString().split('T')[0],
                })}
              >
                Switch to No Contact
              </Button>
              <Button
                variant="outline"
                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                onClick={() => updateSituation({ stage: 'archived', is_archived: true })}
              >
                Archive
              </Button>
              <Button
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
