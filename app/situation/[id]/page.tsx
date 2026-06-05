import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SituationDetailClient } from './SituationDetailClient'
import type { Situation, Interaction, AIAdvice, Profile } from '@/types'

export default async function SituationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const [
    { data: situation },
    { data: interactions },
    { data: advice },
    { data: profile },
  ] = await Promise.all([
    supabase.from('situations').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('interactions').select('*').eq('situation_id', id).eq('user_id', user.id).order('date', { ascending: false }),
    supabase.from('ai_advice').select('*').eq('situation_id', id).eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!situation) notFound()

  return (
    <SituationDetailClient
      situation={situation as Situation}
      interactions={(interactions ?? []) as Interaction[]}
      advice={(advice ?? []) as AIAdvice[]}
      profile={(profile ?? null) as unknown as Profile}
    />
  )
}
