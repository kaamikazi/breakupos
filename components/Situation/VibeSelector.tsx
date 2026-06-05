'use client'

import { VIBE_COLORS } from '@/types'
import type { Vibe } from '@/types'

interface VibeSelectorProps {
  value: Vibe
  onChange: (vibe: Vibe) => void
}

const VIBES: { id: Vibe; label: string }[] = [
  { id: 'hot', label: 'Hot' },
  { id: 'warm', label: 'Warm' },
  { id: 'cold', label: 'Cold' },
  { id: 'dead', label: 'Dead' },
]

export function VibeSelector({ value, onChange }: VibeSelectorProps) {
  return (
    <div className="flex gap-2">
      {VIBES.map(vibe => (
        <button
          key={vibe.id}
          type="button"
          onClick={() => onChange(vibe.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all border ${
            value === vibe.id
              ? 'border-transparent text-zinc-900 font-medium'
              : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
          }`}
          style={value === vibe.id ? { backgroundColor: VIBE_COLORS[vibe.id] } : {}}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: VIBE_COLORS[vibe.id] }}
          />
          {vibe.label}
        </button>
      ))}
    </div>
  )
}
