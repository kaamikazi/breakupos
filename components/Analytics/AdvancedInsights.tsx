'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import type { Interaction, Situation } from '@/types'

interface AdvancedInsightsProps {
  situations: Situation[]
  interactions: Interaction[]
}

export function AdvancedInsights({ situations, interactions }: AdvancedInsightsProps) {
  const data = useMemo(() => {
    const interactionsBySituation = new Map<string, Interaction[]>()
    for (const interaction of interactions) {
      const existing = interactionsBySituation.get(interaction.situation_id) ?? []
      existing.push(interaction)
      interactionsBySituation.set(interaction.situation_id, existing)
    }

    const bySituation = situations.map(situation => {
      const situationInteractions = interactionsBySituation.get(situation.id) ?? []
      const ghosting = situationInteractions.filter(i => i.type === 'ghost' || i.type === 'left_on_read').length
      const negatives = situationInteractions.filter(i => i.sentiment === 'negative').length
      const positives = situationInteractions.filter(i => i.sentiment === 'positive').length
      const consistency = situationInteractions.length > 1 ? Math.round((positives / situationInteractions.length) * 100) : 0
      return {
        name: situation.name,
        investment: situation.emotional_invest,
        redFlags: situation.red_flags?.length ?? 0,
        greenFlags: situation.green_flags?.length ?? 0,
        greenRatio: (situation.green_flags?.length ?? 0) / Math.max(1, (situation.red_flags?.length ?? 0) + (situation.green_flags?.length ?? 0)),
        ghosting,
        consistency,
        drains: situation.emotional_invest * 10 - situation.compatibility + negatives * 8,
      }
    })

    const investmentOverTime = interactions
      .map(interaction => {
        const situation = situations.find(s => s.id === interaction.situation_id)
        return situation ? {
          date: format(parseISO(interaction.date), 'MMM d'),
          investment: situation.emotional_invest,
        } : null
      })
      .filter(Boolean)
      .slice(-20)

    return {
      bySituation,
      investmentOverTime,
      mostDraining: [...bySituation].sort((a, b) => b.drains - a.drains)[0],
      bestGreenRatio: [...bySituation].sort((a, b) => b.greenRatio - a.greenRatio)[0],
    }
  }, [situations, interactions])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Emotional Investment Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.investmentOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fill: '#71717a', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="investment" stroke="#ff4d6d" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Red Flags By Person</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.bySituation}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#71717a', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
              <Bar dataKey="redFlags" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Ghosting Frequency</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.bySituation}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#71717a', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
              <Bar dataKey="ghosting" fill="#94a3b8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Interaction Consistency</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.bySituation}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
              <Bar dataKey="consistency" fill="#14b8a6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-2">Who Drains You Most</h3>
          <p className="text-2xl font-bold text-white sensitive-name">{data.mostDraining?.name ?? 'No data yet'}</p>
          <p className="text-sm text-zinc-500 mt-2">Based on high investment, low compatibility, and negative interactions.</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-2">Best Green Flag Ratio</h3>
          <p className="text-2xl font-bold text-white sensitive-name">{data.bestGreenRatio?.name ?? 'No data yet'}</p>
          <p className="text-sm text-zinc-500 mt-2">Highest share of green flags compared with total logged flags.</p>
        </div>
      </div>
    </div>
  )
}
