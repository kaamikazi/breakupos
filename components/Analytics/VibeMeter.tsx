'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { VIBE_COLORS } from '@/types'
import type { Situation, Vibe } from '@/types'

interface VibeMeterProps {
  situations: Situation[]
}

const VIBES: Vibe[] = ['hot', 'warm', 'cold', 'dead']
const VIBE_LABELS: Record<Vibe, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
  dead: 'Dead',
}

export function VibeMeter({ situations }: VibeMeterProps) {
  const data = VIBES.map(v => ({
    name: VIBE_LABELS[v],
    value: situations.filter(s => s.vibe === v).length,
    color: VIBE_COLORS[v],
  })).filter(d => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Vibe Breakdown</h3>
        <p className="text-sm text-zinc-500 text-center py-10">No data yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Vibe Breakdown</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend
            formatter={(value) => <span style={{ color: '#a1a1aa', fontSize: 12 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
