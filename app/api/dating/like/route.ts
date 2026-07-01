import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { datingActionSchema, getOrderedMatchPair } from '@/lib/dating'
import { getDailyLikeStatus, getDailyLikeWindow, shouldNotifyNewMatch } from '@/lib/dating-premium'
import { getClientIp, jsonError, parseJson, rateLimit } from '@/lib/api'
import { buildNotification } from '@/lib/notifications'
import { logServerError } from '@/lib/logging'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const limit = await rateLimit(`dating-like:${user.id}:${getClientIp(req)}`, 80, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Like rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, datingActionSchema)
  if (parsed.error) return parsed.error

  const targetUserId = parsed.data.target_user_id
  if (targetUserId === user.id) return jsonError('You cannot like your own profile.', 400)

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient.from('profiles').select('plan').eq('id', user.id).single()

  const { data: targetProfile } = await serviceClient
    .from('dating_profiles')
    .select('user_id')
    .eq('user_id', targetUserId)
    .eq('visibility_status', 'visible')
    .eq('onboarding_completed', true)
    .maybeSingle()

  if (!targetProfile) return jsonError('Profile is not available.', 404)

  const { data: blocked } = await serviceClient
    .from('user_blocks')
    .select('id')
    .or(`and(blocker_user_id.eq.${user.id},blocked_user_id.eq.${targetUserId}),and(blocker_user_id.eq.${targetUserId},blocked_user_id.eq.${user.id})`)
    .limit(1)

  if (blocked && blocked.length > 0) return jsonError('This profile is not available.', 403)

  const { data: existingLike } = await serviceClient
    .from('profile_likes')
    .select('id')
    .eq('liker_user_id', user.id)
    .eq('liked_user_id', targetUserId)
    .maybeSingle()

  if (existingLike) {
    const [existingUserOneId, existingUserTwoId] = getOrderedMatchPair(user.id, targetUserId)
    const { data: existingMatch } = await serviceClient
      .from('matches')
      .select('*')
      .eq('user_one_id', existingUserOneId)
      .eq('user_two_id', existingUserTwoId)
      .maybeSingle()
    const { count: currentLikesToday } = await serviceClient
      .from('profile_likes')
      .select('id', { count: 'exact', head: true })
      .eq('liker_user_id', user.id)
      .gte('created_at', getDailyLikeWindow())
    return NextResponse.json({
      matched: Boolean(existingMatch),
      match: existingMatch ?? null,
      like_limit: getDailyLikeStatus({ plan: profile?.plan, likesToday: currentLikesToday ?? 0 }),
      duplicate: true,
    })
  }

  const { count: likesToday } = await serviceClient
    .from('profile_likes')
    .select('id', { count: 'exact', head: true })
    .eq('liker_user_id', user.id)
    .gte('created_at', getDailyLikeWindow())
  const likeStatus = getDailyLikeStatus({ plan: profile?.plan, likesToday: likesToday ?? 0 })
  if (!likeStatus.canLike) return jsonError('Daily like limit reached. Upgrade to Pro for more dating likes.', 403)

  const { error: likeError } = await serviceClient
    .from('profile_likes')
    .upsert({ liker_user_id: user.id, liked_user_id: targetUserId }, { onConflict: 'liker_user_id,liked_user_id' })

  if (likeError) {
    logServerError('Dating like insert failed', {
      route: 'dating/like',
      operation: 'insert_like',
      code: likeError.code ?? 'unknown',
      errorMessage: likeError.message,
      userId: user.id,
    })
    return jsonError('Could not save this like right now.', 500)
  }

  const { data: reciprocal } = await serviceClient
    .from('profile_likes')
    .select('id')
    .eq('liker_user_id', targetUserId)
    .eq('liked_user_id', user.id)
    .maybeSingle()

  const nextStatus = getDailyLikeStatus({ plan: profile?.plan, likesToday: (likesToday ?? 0) + 1 })
  if (!reciprocal) return NextResponse.json({ matched: false, like_limit: nextStatus })

  const [userOneId, userTwoId] = getOrderedMatchPair(user.id, targetUserId)
  const { data: existingMatchBeforeUpsert } = await serviceClient
    .from('matches')
    .select('id')
    .eq('user_one_id', userOneId)
    .eq('user_two_id', userTwoId)
    .maybeSingle()

  const { data: match, error: matchError } = await serviceClient
    .from('matches')
    .upsert({ user_one_id: userOneId, user_two_id: userTwoId }, { onConflict: 'user_one_id,user_two_id' })
    .select()
    .single()

  if (matchError) {
    logServerError('Dating match upsert failed', {
      route: 'dating/like',
      operation: 'upsert_match',
      code: matchError.code ?? 'unknown',
      errorMessage: matchError.message,
      userId: user.id,
    })
    return jsonError('Could not create this match right now.', 500)
  }

  if (shouldNotifyNewMatch(existingMatchBeforeUpsert)) {
    await Promise.all([
      serviceClient.from('notifications').insert(buildNotification({
        user_id: targetUserId,
        type: 'new_match',
        title: 'New match',
        body: 'Someone you liked also liked you back.',
        link_url: `/matches/${match.id}`,
      })),
      serviceClient.from('notifications').insert(buildNotification({
        user_id: user.id,
        type: 'new_match',
        title: 'New match',
        body: 'You have a new mutual match.',
        link_url: `/matches/${match.id}`,
      })),
    ])
  }

  return NextResponse.json({ matched: true, match, like_limit: nextStatus })
}
