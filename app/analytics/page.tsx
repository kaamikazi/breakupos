import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PlanGate } from '@/components/shared/PlanGate'
import { EmotionalROIChart } from '@/components/Analytics/EmotionalROIChart'
import { StageDistribution } from '@/components/Analytics/StageDistribution'
import { VibeMeter } from '@/components/Analytics/VibeMeter'
import { RedFlagLeaderboard } from '@/components/Analytics/RedFlagLeaderboard'
import { InteractionFrequencyChart } from './InteractionFrequencyChart'
import { AdvancedInsights } from '@/components/Analytics/AdvancedInsights'
import { ExportButton } from './ExportButton'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Situation, Interaction, Profile } from '@/types'

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: situations }, { data: interactions }, { data: profile }] = await Promise.all([
    supabase.from('situations').select('*').eq('user_id', user.id),
    supabase.from('interactions').select('*').eq('user_id', user.id),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  const sits = (situations ?? []) as Situation[]
  const ints = (interactions ?? []) as Interaction[]
  const prof = (profile ?? null) as unknown as Profile

  const activeSits = sits.filter(s => !s.is_archived)
  const avgCompatibility = activeSits.length
    ? Math.round(activeSits.reduce((s, sit) => s + sit.compatibility, 0) / activeSits.length)
    : 0
  const totalInvestment = activeSits.reduce((s, sit) => s + sit.emotional_invest, 0)
  const avgInvestment = activeSits.length ? totalInvestment / activeSits.length : 0
  const emotionalROI = avgInvestment > 0 ? (avgCompatibility / avgInvestment * 10).toFixed(1) : '0.0'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-sm text-zinc-400">The data does not gaslight you.</p>
        </div>
        <ExportButton isPro={prof?.plan === 'pro'} />
      </div>

      {sits.length === 0 && (
        <div className="mb-8">
          <EmptyState
            icon="📈"
            title="Analytics start after your first situation"
            description="Create a situation and log a few interactions. BreakupOS will then show investment, flags, ghosting, consistency, and emotional ROI patterns."
          />
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Situations', value: activeSits.length },
          { label: 'Avg Compatibility', value: `${avgCompatibility}%` },
          { label: 'Total Investment', value: totalInvestment },
          { label: 'Emotional ROI', value: emotionalROI },
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <PlanGate isPro={prof.plan === 'pro'} feature="Full Analytics Dashboard">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StageDistribution situations={sits} />
            <VibeMeter situations={sits} />
          </div>
          <EmotionalROIChart situations={activeSits} />
          <InteractionFrequencyChart interactions={ints} />
          <RedFlagLeaderboard situations={sits} />
          <AdvancedInsights situations={sits} interactions={ints} />
        </div>
      </PlanGate>
    </div>
  )
}
