'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface FlagManagerProps {
  redFlags: string[]
  greenFlags: string[]
  onUpdate: (red: string[], green: string[]) => void
}

export function FlagManager({ redFlags, greenFlags, onUpdate }: FlagManagerProps) {
  const [newRed, setNewRed] = useState('')
  const [newGreen, setNewGreen] = useState('')

  const addFlag = (type: 'red' | 'green', value: string) => {
    if (!value.trim()) return
    if (type === 'red') {
      onUpdate([...redFlags, value.trim()], greenFlags)
      setNewRed('')
    } else {
      onUpdate(redFlags, [...greenFlags, value.trim()])
      setNewGreen('')
    }
  }

  const removeFlag = (type: 'red' | 'green', index: number) => {
    if (type === 'red') {
      onUpdate(redFlags.filter((_, i) => i !== index), greenFlags)
    } else {
      onUpdate(redFlags, greenFlags.filter((_, i) => i !== index))
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Red flags */}
      <div>
        <h4 className="text-sm font-semibold text-red-400 mb-3">🚩 Red Flags</h4>
        <div className="flex flex-wrap gap-1.5 mb-3 min-h-[32px]">
          {redFlags.map((flag, i) => (
            <Badge
              key={i}
              variant="outline"
              className="border-red-500/40 text-red-300 cursor-pointer hover:bg-red-500/20 transition-colors text-xs"
              onClick={() => removeFlag('red', i)}
            >
              {flag} ×
            </Badge>
          ))}
          {redFlags.length === 0 && (
            <span className="text-xs text-zinc-600">No red flags yet. Lucky.</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add red flag..."
            value={newRed}
            onChange={e => setNewRed(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addFlag('red', newRed)}
            className="bg-zinc-900 border-zinc-700 text-white text-sm h-8"
          />
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 h-8 shrink-0"
            onClick={() => addFlag('red', newRed)}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Green flags */}
      <div>
        <h4 className="text-sm font-semibold text-emerald-400 mb-3">✅ Green Flags</h4>
        <div className="flex flex-wrap gap-1.5 mb-3 min-h-[32px]">
          {greenFlags.map((flag, i) => (
            <Badge
              key={i}
              variant="outline"
              className="border-emerald-500/40 text-emerald-300 cursor-pointer hover:bg-emerald-500/20 transition-colors text-xs"
              onClick={() => removeFlag('green', i)}
            >
              {flag} ×
            </Badge>
          ))}
          {greenFlags.length === 0 && (
            <span className="text-xs text-zinc-600">No green flags yet.</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add green flag..."
            value={newGreen}
            onChange={e => setNewGreen(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addFlag('green', newGreen)}
            className="bg-zinc-900 border-zinc-700 text-white text-sm h-8"
          />
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 h-8 shrink-0"
            onClick={() => addFlag('green', newGreen)}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
