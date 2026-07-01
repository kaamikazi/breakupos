import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { jsonError } from '@/lib/api'
import { rankDiscoveryProfiles } from '@/lib/dating'
import { advancedDiscoveryFilterSchema, applyAdvancedFilters, canExposeWhoLikedYou, getCompatibilityPreview, getDailyLikeStatus, getDailyLikeWindow } from '@/lib/dating-premium'
import type { DatingProfileWithPhotos } from '@/types'
import { logServerError } from '@/lib/logging'

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const serviceClient = createServiceClient()
  const [
    { data: liked },
    { data: passed },
    { data: blocksOut },
    { data: blocksIn },
    { data: currentProfile },
    { data: accountProfile },
    { data: profiles, error },
  ] = await Promise.all([
    serviceClient.from('profile_likes').select('liked_user_id').eq('liker_user_id', user.id),
    serviceClient.from('profile_passes').select('passed_user_id').eq('passer_user_id', user.id),
    serviceClient.from('user_blocks').select('blocked_user_id').eq('blocker_user_id', user.id),
    serviceClient.from('user_blocks').select('blocker_user_id').eq('blocked_user_id', user.id),
    serviceClient.from('dating_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    serviceClient.from('profiles').select('plan').eq('id', user.id).single(),
    serviceClient
      .from('dating_profiles')
      .select('*')
      .eq('visibility_status', 'visible')
      .eq('onboarding_completed', true)
      .neq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50),
  ])

  if (error) {
    logServerError('Dating discovery query failed', {
      route: 'dating/discover',
      operation: 'list_profiles',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not load discovery right now.', 500)
  }
  const isPro = accountProfile?.plan === 'pro'
  const url = new URL(req.url)
  const hasAdvancedParams = ['min_age', 'max_age', 'city', 'relationship_goal', 'shared_interests', 'min_quality', 'recently_active']
    .some(key => url.searchParams.has(key))
  const parsedFilters = advancedDiscoveryFilterSchema.safeParse(Object.fromEntries(url.searchParams.entries()))
  if (!parsedFilters.success) return Response.json({ error: parsedFilters.error.flatten() }, { status: 400 })
  if (hasAdvancedParams && !isPro) return jsonError('Advanced discovery filters are a Pro feature.', 403)

  const excluded = new Set<string>([
    ...(liked ?? []).map(row => row.liked_user_id),
    ...(passed ?? []).map(row => row.passed_user_id),
    ...(blocksOut ?? []).map(row => row.blocked_user_id),
    ...(blocksIn ?? []).map(row => row.blocker_user_id),
  ])

  const visibleProfiles = (profiles ?? []).filter(profile => !excluded.has(profile.user_id))
  const userIds = visibleProfiles.map(profile => profile.user_id)

  const { data: photos, error: photosError } = userIds.length
    ? await serviceClient.from('profile_photos').select('*').in('user_id', userIds).order('position')
    : { data: [], error: null }

  if (photosError) {
    logServerError('Dating discovery photos query failed', {
      route: 'dating/discover',
      operation: 'list_profile_photos',
      code: photosError.code ?? 'unknown',
      errorMessage: photosError.message,
      userId: user.id,
    })
    return jsonError('Could not load discovery photos right now.', 500)
  }

  const hydratedProfiles = visibleProfiles
    .map(profile => ({
      ...profile,
      photos: (photos ?? [])
        .filter(photo => photo.user_id === profile.user_id)
        .map(photo => ({ ...photo, storage_path: null })),
    }))
    .filter(profile => profile.photos.length > 0) as DatingProfileWithPhotos[]

  const filteredProfiles = isPro ? applyAdvancedFilters(hydratedProfiles, parsedFilters.data, currentProfile) : hydratedProfiles
  const rankedProfiles = rankDiscoveryProfiles(filteredProfiles, currentProfile)
  const { count: likesToday } = await serviceClient
    .from('profile_likes')
    .select('id', { count: 'exact', head: true })
    .eq('liker_user_id', user.id)
    .gte('created_at', getDailyLikeWindow())
  const { data: inboundLikes } = await serviceClient
    .from('profile_likes')
    .select('*')
    .eq('liked_user_id', user.id)
    .limit(25)
  const blockedUserIds = new Set<string>([
    ...(blocksOut ?? []).map(row => row.blocked_user_id),
    ...(blocksIn ?? []).map(row => row.blocker_user_id),
  ])
  const visibleInboundLikes = (inboundLikes ?? []).filter(like => canExposeWhoLikedYou({ isPro, liker: like, blockedUserIds }))

  return NextResponse.json({
    profiles: rankedProfiles.map(profile => ({
      ...profile,
      compatibility_preview: getCompatibilityPreview(profile, currentProfile),
    })),
    isPro,
    like_limit: getDailyLikeStatus({ plan: accountProfile?.plan, likesToday: likesToday ?? 0 }),
    who_liked_you: {
      locked: !isPro,
      count: inboundLikes?.length ?? 0,
      visible_likes: isPro ? visibleInboundLikes : [],
    },
    boost: {
      available: false,
      copy: 'Profile boost is planned for Pro. It is not changing ranking yet.',
    },
  })
}
