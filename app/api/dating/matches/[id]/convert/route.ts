import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { calculateCompatibility } from '@/lib/compatibility'
import { buildSituationFromMatchProfile, getOtherParticipantId, isMatchParticipant } from '@/lib/dating-chat'
import { jsonError } from '@/lib/api'
import { checkSituationsQuota, ensureProfileForUser } from '@/lib/quota'
import { logServerError } from '@/lib/logging'

interface ConvertRouteProps {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, { params }: ConvertRouteProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  await ensureProfileForUser(user)

  const serviceClient = createServiceClient()
  const { data: existing } = await serviceClient
    .from('situations')
    .select('id')
    .eq('user_id', user.id)
    .eq('match_id', id)
    .maybeSingle()

  if (existing) return NextResponse.json({ situation_id: existing.id, existing: true })

  const canCreate = await checkSituationsQuota(user.id)
  if (!canCreate) return jsonError('Situation limit reached. Upgrade to Pro for unlimited situations.', 403)

  const { data: match } = await serviceClient.from('matches').select('*').eq('id', id).maybeSingle()
  const otherUserId = match ? getOtherParticipantId(match, user.id) : null
  if (!isMatchParticipant(match, user.id) || !otherUserId) return jsonError('Match not found', 404)

  const { data: profile } = await serviceClient
    .from('dating_profiles')
    .select('display_name,city')
    .eq('user_id', otherUserId)
    .maybeSingle()

  if (!profile) return jsonError('Matched profile not found', 404)

  const payload = buildSituationFromMatchProfile(profile, id)
  const compatibility = calculateCompatibility(
    { red_flags: [], green_flags: [], emotional_invest: payload.emotional_invest, stage: payload.stage },
    []
  )

  const { data: situation, error } = await serviceClient
    .from('situations')
    .insert({
      ...payload,
      compatibility,
      user_id: user.id,
      situation_person_type: 'matched_user',
      matched_user_id: otherUserId,
      manual_name: null,
      manual_photo_url: null,
    })
    .select('id')
    .single()

  if (error) {
    logServerError('Match conversion failed', {
      route: 'dating/matches/[id]/convert',
      operation: 'create_situation',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not track this match in Breakup OS right now.', 500)
  }
  return NextResponse.json({ situation_id: situation.id, existing: false }, { status: 201 })
}
