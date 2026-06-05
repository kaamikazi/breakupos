import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PrivacyClient } from './PrivacyClient'

export default async function PrivacyPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Privacy</h1>
      <p className="text-sm text-zinc-400 mb-8">
        Sensitive data deserves boringly clear controls: hide names, export your data, or delete everything. BreakupOS does not replace therapy, legal advice, crisis support, or safety planning with qualified professionals.
      </p>
      <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
        If you are dealing with abuse, stalking, harassment, threats, coercion, or self-harm risk, prioritize real-world safety: trusted people, local emergency services, crisis lines, or professional support.
      </div>
      <PrivacyClient />
    </div>
  )
}
