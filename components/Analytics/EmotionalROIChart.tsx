'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import type { Situation } from '@/types'

interface EmotionalROIChartProps {
  situations: Situation[]
}

export function EmotionalROIChart({ situations }: EmotionalROIChartProps) {
  const data = situations.map(s => ({
    x: s.emotional_invest,
    y: s.compatibility,
    name: s.name,
  }))

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Investment vs Compatibility</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 11]}
            label={{ value: 'Emotional Investment', position: 'bottom', fill: '#71717a', fontSize: 11 }}
            tick={{ fill: '#71717a', fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            label={{ value: 'Compatibility', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 11 }}
            tick={{ fill: '#71717a', fontSize: 11 }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
            formatter={(value, name) => [value, name === 'x' ? 'Investment' : 'Compatibility']}
          />
          <Scatter data={data} fill="#ff4d6d">
            <LabelList dataKey="name" position="top" style={{ fill: '#a1a1aa', fontSize: 10 }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
