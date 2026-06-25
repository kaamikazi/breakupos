import Link from 'next/link'
import { redirect } from 'next/navigation'
import { differenceInDays, parseISO } from 'date-fns'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import type { Situation } from '@/types'

export default async function RecoveryPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await supabase
    .from('situations')
    .select('*')
    .eq('user_id', user.id)
    .or('is_breakup_mode.eq.true,stage.eq.no_contact')
    .order('updated_at', { ascending: false })

  const situations = (data ?? []) as Situation[]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Breakup Recovery</h1>
          <p className="text-sm text-zinc-400">
            No-contact streaks, reasons, relapses, and milestones for the part of healing that happens after the decision.
          </p>
        </div>
        <Link href="/dashboard">
          <Button className="bg-pink-500 hover:bg-pink-600 text-white">Add or open a situation</Button>
        </Link>
      </div>

      {situations.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🛡️</div>
          <h2 className="text-lg font-semibold text-white mb-2">No recovery cases yet</h2>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto mb-5">
            Open a situation, switch it to No Contact, and BreakupOS will track the streak, reasons, relapses, and milestones.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Go to Pipeline
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {situations.map(situation => {
            const streak = situation.no_contact_started
              ? Math.max(0, differenceInDays(new Date(), parseISO(situation.no_contact_started)))
              : 0
            return (
              <Link
                key={situation.id}
                href={`/situation/${situation.id}`}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-3xl">{situation.avatar_emoji}</span>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-white truncate sensitive-name">{situation.name}</h2>
                      <p className="text-xs text-zinc-500">No-contact recovery</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-white">{streak}</div>
                    <div className="text-xs text-emerald-300">days</div>
                  </div>
                </div>
                <div className="text-sm text-zinc-400">
                  {(situation.no_contact_reasons ?? [])[0] ?? 'Add a reason your future self can lean on.'}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
