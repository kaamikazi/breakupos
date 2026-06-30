import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { jsonError } from '@/lib/api'
import {
  computeCommunityVerdict,
  rankMostDivisive,
  rankMostRedFlagged,
  rankTopLoved,
  rankTrendingToday,
  socialRankingsQuerySchema,
  type SocialSection,
} from '@/lib/social'
import { getPublicDisplayName } from '@/lib/social-profile'
import { logServerError } from '@/lib/logging'

// Bound the ranking workload: rank across the most recent live posts only.
const RANKING_POST_POOL = 400

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const url = new URL(req.url)
  const parsed = socialRankingsQuerySchema.safeParse({
    section: url.searchParams.get('section') || undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const serviceClient = createServiceClient()
  let postsQuery = serviceClient
    .from('social_posts')
    .select('id,user_id,image_url,section,created_at,profiles(public_display_name,username,display_name,avatar_url,public_profile_visible)')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(RANKING_POST_POOL)

  if (parsed.data.section) postsQuery = postsQuery.eq('section', parsed.data.section)

  let { data: posts, error } = await postsQuery
  if (error && /public_display_name|username/i.test(error.message)) {
    let fallbackQuery = serviceClient
      .from('social_posts')
      .select('id,user_id,image_url,section,created_at,profiles(display_name,public_profile_visible)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(RANKING_POST_POOL)
    if (parsed.data.section) fallbackQuery = fallbackQuery.eq('section', parsed.data.section)
    const fallback = await fallbackQuery
    posts = fallback.data as typeof posts
    error = fallback.error
  }
  if (error) {
    logServerError('Social rankings query failed', {
      route: 'social/rankings',
      operation: 'list_posts',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
    })
    return jsonError('Could not load social rankings right now.', 500)
  }

  const postIds = (posts ?? []).map(post => post.id)
  let reactions: { post_id: string; reaction_type: string; created_at: string }[] = []
  if (postIds.length > 0) {
    const { data: reactionRows, error: reactionsError } = await serviceClient
      .from('social_post_reactions')
      .select('post_id,reaction_type,created_at')
      .in('post_id', postIds)
    if (reactionsError) {
      logServerError('Social rankings reactions query failed', {
        route: 'social/rankings',
        operation: 'list_reactions',
        code: reactionsError.code ?? 'unknown',
        errorMessage: reactionsError.message,
      })
      return jsonError('Could not load social rankings right now.', 500)
    }
    reactions = reactionRows ?? []
  }

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000
  const rankable = (posts ?? []).filter(post => {
    const profile = (post as typeof post & { profiles?: { public_profile_visible?: boolean | null } | null }).profiles
    return profile?.public_profile_visible === true
  }).map(post => {
    const postReactions = reactions.filter(reaction => reaction.post_id === post.id)
    const loveCount = postReactions.filter(reaction => reaction.reaction_type === 'love').length
    const redFlagCount = postReactions.filter(reaction => reaction.reaction_type === 'red_flag').length
    const safePost = post as typeof post & {
      profiles: {
        public_display_name?: string | null
        username?: string | null
        display_name: string | null
        avatar_url?: string | null
      } | null
    }
    const profile = safePost.profiles
    return {
      id: safePost.id,
      image_url: safePost.image_url,
      section: safePost.section as SocialSection,
      created_at: safePost.created_at,
      display_name: profile ? getPublicDisplayName(profile) : 'Breakup OS User',
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      love_count: loveCount,
      red_flag_count: redFlagCount,
      reactions_today: postReactions.filter(reaction => new Date(reaction.created_at).getTime() >= dayAgo).length,
      verdict: computeCommunityVerdict(loveCount, redFlagCount),
    }
  })

  return NextResponse.json({
    section: parsed.data.section ?? null,
    top_loved: rankTopLoved(rankable),
    most_red_flagged: rankMostRedFlagged(rankable),
    most_divisive: rankMostDivisive(rankable),
    trending_today: rankTrendingToday(rankable),
  })
}
