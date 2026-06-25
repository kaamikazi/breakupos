import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MessageAnalyzer } from '@/components/Advisor/MessageAnalyzer'
import type { Profile } from '@/types'

export default async function AnalyzerPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const prof = profile as Profile | null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Message Analyzer</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Paste a conversation and get signal, risk, and a sane next reply.
      </p>
      <MessageAnalyzer isPro={prof?.plan === 'pro'} />
    </div>
  )
}
