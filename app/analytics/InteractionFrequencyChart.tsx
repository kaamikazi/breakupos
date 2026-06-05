'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays, parseISO, isSameDay } from 'date-fns'
import type { Interaction } from '@/types'

interface InteractionFrequencyChartProps {
  interactions: Interaction[]
}

export function InteractionFrequencyChart({ interactions }: InteractionFrequencyChartProps) {
  const data = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const day = subDays(new Date(), 29 - i)
      return {
        date: format(day, 'MMM d'),
        count: interactions.filter(int => {
          try {
            return isSameDay(parseISO(int.date), day)
          } catch {
            return false
          }
        }).length,
      }
    })
    return days
  }, [interactions])

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Interaction Frequency (Last 30 Days)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#71717a', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fill: '#71717a', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
            labelStyle={{ color: '#fff', fontSize: 12 }}
            cursor={{ fill: '#27272a' }}
          />
          <Bar dataKey="count" fill="#00e5ff" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
