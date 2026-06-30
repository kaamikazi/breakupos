import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getClientIp, jsonError, parseJson, rateLimit } from '@/lib/api'
import { computeCommunityVerdict, decideReaction, socialReactionSchema, type SocialReaction } from '@/lib/social'
import { logServerError } from '@/lib/logging'

interface ReactRouteProps {
  params: Promise<{ id: string }>
}

const idSchema = z.string().uuid()

export async function POST(req: NextRequest, { params }: ReactRouteProps) {
  const { id } = await params
  if (!idSchema.safeParse(id).success) return jsonError('Invalid post id.', 400)

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const limit = await rateLimit(`social-react:${user.id}:${getClientIp(req)}`, 240, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Reaction rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, socialReactionSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const { data: post } = await serviceClient
    .from('social_posts')
    .select('id,is_deleted')
    .eq('id', id)
    .maybeSingle()

  if (!post) return jsonError('Post not found.', 404)

  const { data: existing } = await serviceClient
    .from('social_post_reactions')
    .select('id,reaction_type')
    .eq('post_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const decision = decideReaction({
    postIsDeleted: post.is_deleted,
    existingReaction: (existing?.reaction_type as SocialReaction | undefined) ?? null,
    nextReaction: parsed.data.reaction_type,
  })

  if (decision === 'rejected_deleted') return jsonError('This post is no longer available.', 410)

  if (decision !== 'noop') {
    // UNIQUE (post_id, user_id) guarantees one reaction per user even under races.
    const { error } = await serviceClient
      .from('social_post_reactions')
      .upsert(
        { post_id: id, user_id: user.id, reaction_type: parsed.data.reaction_type },
        { onConflict: 'post_id,user_id' }
      )
    if (error) {
      logServerError('Social reaction upsert failed', {
        route: 'social/posts/[id]/react',
        operation: 'upsert_reaction',
        code: error.code ?? 'unknown',
        errorMessage: error.message,
        userId: user.id,
      })
      return jsonError('Could not save your reaction right now.', 500)
    }
  }

  const { data: reactions, error: countError } = await serviceClient
    .from('social_post_reactions')
    .select('reaction_type')
    .eq('post_id', id)
  if (countError) {
    logServerError('Social reaction count failed', {
      route: 'social/posts/[id]/react',
      operation: 'count_reactions',
      code: countError.code ?? 'unknown',
      errorMessage: countError.message,
      userId: user.id,
    })
    return jsonError('Could not refresh reaction counts right now.', 500)
  }

  const loveCount = (reactions ?? []).filter(reaction => reaction.reaction_type === 'love').length
  const redFlagCount = (reactions ?? []).filter(reaction => reaction.reaction_type === 'red_flag').length

  return NextResponse.json({
    my_reaction: parsed.data.reaction_type,
    changed: decision !== 'noop',
    love_count: loveCount,
    red_flag_count: redFlagCount,
    verdict: computeCommunityVerdict(loveCount, redFlagCount),
  })
}
