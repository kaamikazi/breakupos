'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VibeSelector } from './VibeSelector'
import { STAGES } from '@/types'
import type { Stage, Vibe, ContactMethod } from '@/types'
import { toast } from 'sonner'

const EMOJI_OPTIONS = ['🧑', '👩', '👨', '🧕', '👱', '🧔', '👼', '🦋', '🌹', '💀', '👾', '🤡']

interface SituationFormProps {
  open: boolean
  onClose: () => void
}

export function SituationForm({ open, onClose }: SituationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    avatar_emoji: '🧑',
    stage: 'orbiting' as Stage,
    emotional_invest: 5,
    vibe: 'warm' as Vibe,
    contact_method: 'irl' as ContactMethod,
    first_contact: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/situations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          first_contact: form.first_contact || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create situation')
        return
      }
      toast.success(`${form.name} added to the pipeline.`)
      router.push(`/situation/${data.id}`)
      onClose()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">New Situation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar + Name */}
          <div className="flex gap-3">
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Avatar</Label>
              <Select value={form.avatar_emoji} onValueChange={(v) => setForm(f => ({ ...f, avatar_emoji: v ?? '🧑' }))}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white w-16 h-9">
                  <span className="text-xl">{form.avatar_emoji}</span>
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {EMOJI_OPTIONS.map(e => (
                    <SelectItem key={e} value={e} className="text-white text-xl">{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-zinc-400 text-xs mb-1 block">Name / Nickname *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Their name or a codename"
                className="bg-zinc-900 border-zinc-700 text-white h-9"
                required
              />
            </div>
          </div>

          {/* Stage + Contact Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Stage</Label>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v as Stage }))}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm">
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
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">How you met</Label>
              <Select value={form.contact_method} onValueChange={v => setForm(f => ({ ...f, contact_method: v as ContactMethod }))}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {['instagram', 'tinder', 'hinge', 'bumble', 'irl', 'twitter', 'discord', 'other'].map(m => (
                    <SelectItem key={m} value={m} className="text-white capitalize">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Emotional investment */}
          <div>
            <Label className="text-zinc-400 text-xs mb-1 block">
              Emotional Investment: {form.emotional_invest}/10
            </Label>
            <input
              type="range"
              min={1}
              max={10}
              value={form.emotional_invest}
              onChange={e => setForm(f => ({ ...f, emotional_invest: parseInt(e.target.value) }))}
              className="w-full accent-pink-500"
            />
          </div>

          {/* Vibe */}
          <div>
            <Label className="text-zinc-400 text-xs mb-1 block">Vibe</Label>
            <VibeSelector value={form.vibe} onChange={vibe => setForm(f => ({ ...f, vibe }))} />
          </div>

          {/* First contact */}
          <div>
            <Label className="text-zinc-400 text-xs mb-1 block">First contact date</Label>
            <Input
              type="date"
              value={form.first_contact}
              onChange={e => setForm(f => ({ ...f, first_contact: e.target.value }))}
              className="bg-zinc-900 border-zinc-700 text-white h-9"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" className="text-zinc-400" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              {loading ? 'Adding...' : 'Add to Pipeline'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
