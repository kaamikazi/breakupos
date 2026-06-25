import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PlanGate } from '@/components/shared/PlanGate'
import { AdviceCard } from '@/components/Advisor/AdviceCard'
import type { AIAdvice, Profile } from '@/types'

export default async function AdvisorPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: advice }, { data: profile }] = await Promise.all([
    supabase
      .from('ai_advice')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  const prof = (profile ?? null) as unknown as Profile

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">AI Advisor</h1>
      <p className="text-sm text-zinc-400 mb-8">
        Brutally honest. Context-aware. Available per situation on the detail page.
        {prof.plan === 'free' && (
          <span className="text-pink-400"> {prof.ai_advice_limit - prof.ai_advice_used} uses remaining this month.</span>
        )}
      </p>

      <PlanGate isPro={prof.plan === 'pro'} feature="AI Advisor (unlimited)">
        {(advice ?? []).length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-4xl mb-3">🤖</p>
            <p className="text-sm">No advice yet.</p>
            <p className="text-xs mt-1">Open a situation and ask something.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(advice ?? []).map(a => (
              <AdviceCard key={a.id} advice={a as AIAdvice} />
            ))}
          </div>
        )}
      </PlanGate>
    </div>
  )
}
