'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { InteractionType, Sentiment, Interaction } from '@/types'

const INTERACTION_ICONS: Record<InteractionType, string> = {
  message: '💬',
  date: '📅',
  call: '📞',
  ghost: '👻',
  breadcrumb: '🍞',
  left_on_read: '👁️',
  relapse: '↩',
  boundary: '🧱',
  conflict: '⚠️',
  repair: '🧩',
  stage_change: '➡',
}

interface AddInteractionFormProps {
  situationId: string
  onAdded: (interaction: Interaction) => void
}

export function AddInteractionForm({ situationId, onAdded }: AddInteractionFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: 'message' as InteractionType,
    note: '',
    sentiment: 'neutral' as Sentiment,
    date: new Date().toISOString().split('T')[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, situation_id: situationId }),
      })
      if (!res.ok) throw new Error()
      const interaction = await res.json()
      onAdded(interaction)
      setOpen(false)
      setForm({ type: 'message', note: '', sentiment: 'neutral', date: new Date().toISOString().split('T')[0] })
      toast.success('Interaction logged')
    } catch {
      toast.error('Failed to log interaction')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        onClick={() => setOpen(true)}
      >
        + Log Interaction
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Type</label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as InteractionType }))}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {(Object.entries(INTERACTION_ICONS) as [InteractionType, string][]).map(([type, icon]) => (
                <SelectItem key={type} value={type} className="text-white">
                  {icon} {type.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Sentiment</label>
          <Select value={form.sentiment} onValueChange={v => setForm(f => ({ ...f, sentiment: v as Sentiment }))}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="positive" className="text-white">Positive</SelectItem>
              <SelectItem value="neutral" className="text-white">Neutral</SelectItem>
              <SelectItem value="negative" className="text-white">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Date</label>
        <Input
          type="date"
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Note (optional)</label>
        <Input
          placeholder="What happened?"
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-400"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={loading}
          className="bg-pink-500 hover:bg-pink-600 text-white"
        >
          {loading ? 'Saving...' : 'Log It'}
        </Button>
      </div>
    </form>
  )
}
