import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PipelineBoard } from '@/components/Pipeline/PipelineBoard'
import { DashboardHeader } from './DashboardHeader'
import { WeeklySummaryWidget } from '@/components/Dashboard/WeeklySummaryWidget'
import { OnboardingGuide } from '@/components/Dashboard/OnboardingGuide'
import { ensureProfileForUser } from '@/lib/quota'
import type { Situation, Profile, WeeklySummary } from '@/types'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await ensureProfileForUser(user)

  const [{ data: situations }, { data: profile }, { data: weeklySummary }] = await Promise.all([
    supabase.from('situations').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('weekly_summaries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const prof = (profile ?? null) as unknown as Profile
  const sits = (situations ?? []) as Situation[]

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      <DashboardHeader
        profile={prof}
        situationCount={(situations ?? []).length}
      />
      <WeeklySummaryWidget
        initialSummary={(weeklySummary ?? null) as WeeklySummary | null}
        isPro={prof?.plan === 'pro'}
      />
      {sits.length === 0 && <OnboardingGuide />}
      <PipelineBoard initialSituations={sits} />
    </div>
  )
}
