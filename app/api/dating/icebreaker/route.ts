import { NextRequest, NextResponse } from 'next/server'
import { anthropic, extractText, ADVISOR_SYSTEM_PROMPT } from '@/lib/anthropic'
import { getClientIp, jsonError, parseJson, rateLimit } from '@/lib/api'
import { buildIcebreakerPrompt, getIcebreakerFallback, icebreakerSchema } from '@/lib/dating-premium'
import { isProUser } from '@/lib/premium'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import type { DatingProfileWithPhotos } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)
  if (!(await isProUser(user.id))) return jsonError('AI icebreakers are a Dating Pro feature.', 403)

  const limit = await rateLimit(`dating-icebreaker:${user.id}:${getClientIp(req)}`, 30, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Icebreaker rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, icebreakerSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const [{ data: profile }, { data: photos }, { data: blocks }] = await Promise.all([
    serviceClient
      .from('dating_profiles')
      .select('*')
      .eq('user_id', parsed.data.target_user_id)
      .eq('visibility_status', 'visible')
      .eq('onboarding_completed', true)
      .maybeSingle(),
    serviceClient.from('profile_photos').select('*').eq('user_id', parsed.data.target_user_id).order('position'),
    serviceClient
      .from('user_blocks')
      .select('id')
      .or(`and(blocker_user_id.eq.${user.id},blocked_user_id.eq.${parsed.data.target_user_id}),and(blocker_user_id.eq.${parsed.data.target_user_id},blocked_user_id.eq.${user.id})`),
  ])

  if (!profile || (blocks ?? []).length > 0) return jsonError('Profile is not available.', 404)

  const targetProfile = { ...profile, photos: photos ?? [] } as DatingProfileWithPhotos
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ suggestion: getIcebreakerFallback(targetProfile, parsed.data.tone), fallback: true })
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 120,
    system: `${ADVISOR_SYSTEM_PROMPT}

You write respectful dating-app first messages. Never generate sexual, manipulative, harassing, coercive, insulting, or pressure-based messages.`,
    messages: [{ role: 'user', content: buildIcebreakerPrompt(targetProfile, parsed.data.tone) }],
  })

  const suggestion = extractText(response) || getIcebreakerFallback(targetProfile, parsed.data.tone)

  return NextResponse.json({ suggestion, fallback: false })
}
