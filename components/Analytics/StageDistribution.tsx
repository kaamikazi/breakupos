'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { STAGES } from '@/types'
import type { Situation } from '@/types'

const STAGE_CHART_COLORS: Record<string, string> = {
  orbiting: '#a855f7',
  talking: '#3b82f6',
  situationship: '#f97316',
  dating: '#ff4d6d',
  ghosted: '#71717a',
  red_flag_hold: '#ef4444',
  archived: '#3f3f46',
}

interface StageDistributionProps {
  situations: Situation[]
}

export function StageDistribution({ situations }: StageDistributionProps) {
  const data = STAGES.map(s => ({
    name: s.label,
    count: situations.filter(sit => sit.stage === s.id).length,
    color: STAGE_CHART_COLORS[s.id],
  }))

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Pipeline Funnel</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={100} />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
            cursor={{ fill: '#27272a' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
