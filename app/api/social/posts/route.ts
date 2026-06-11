import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getClientIp, jsonError, rateLimit } from '@/lib/api'
import { ensureProfileForUser } from '@/lib/quota'
import {
  SOCIAL_FEED_PAGE_SIZE,
  SOCIAL_POST_BUCKET,
  computeCommunityVerdict,
  createSocialPostSchema,
  socialFeedQuerySchema,
  validateSocialPhotoFile,
} from '@/lib/social'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const url = new URL(req.url)
  const parsed = socialFeedQuerySchema.safeParse({
    section: url.searchParams.get('section') || undefined,
    before: url.searchParams.get('before') || undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const serviceClient = createServiceClient()
  let query = serviceClient
    .from('social_posts')
    .select('id,user_id,image_url,section,created_at,profiles(display_name)')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(SOCIAL_FEED_PAGE_SIZE)

  if (parsed.data.section) query = query.eq('section', parsed.data.section)
  if (parsed.data.before) query = query.lt('created_at', parsed.data.before)

  const { data: posts, error } = await query
  if (error) return jsonError(error.message, 500)

  const postIds = (posts ?? []).map(post => post.id)
  let reactions: { post_id: string; user_id: string; reaction_type: string }[] = []
  if (postIds.length > 0) {
    const { data: reactionRows, error: reactionsError } = await serviceClient
      .from('social_post_reactions')
      .select('post_id,user_id,reaction_type')
      .in('post_id', postIds)
    if (reactionsError) return jsonError(reactionsError.message, 500)
    reactions = reactionRows ?? []
  }

  const payload = (posts ?? []).map(post => {
    const postReactions = reactions.filter(reaction => reaction.post_id === post.id)
    const loveCount = postReactions.filter(reaction => reaction.reaction_type === 'love').length
    const redFlagCount = postReactions.filter(reaction => reaction.reaction_type === 'red_flag').length
    const mine = postReactions.find(reaction => reaction.user_id === user.id)
    const { profiles, ...rest } = post as typeof post & { profiles: { display_name: string | null } | null }
    return {
      ...rest,
      display_name: profiles?.display_name ?? 'Anonymous',
      is_owner: post.user_id === user.id,
      love_count: loveCount,
      red_flag_count: redFlagCount,
      my_reaction: mine?.reaction_type ?? null,
      verdict: computeCommunityVerdict(loveCount, redFlagCount),
    }
  })

  return NextResponse.json({
    posts: payload,
    next_before: posts && posts.length === SOCIAL_FEED_PAGE_SIZE ? posts[posts.length - 1].created_at : null,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const limit = await rateLimit(`social-post:${user.id}:${getClientIp(req)}`, 15, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Post rate limit reached. Try again later.', 429)

  await ensureProfileForUser(user)

  const formData = await req.formData().catch(() => null)
  if (!formData) return jsonError('Send the photo and section as multipart form data.', 400)

  const file = formData.get('file')
  const validation = validateSocialPhotoFile(file instanceof File ? file : null)
  if (!validation.valid || !(file instanceof File)) {
    return jsonError(validation.error ?? 'A photo is required. Posts are photo-only.', 400)
  }

  const parsed = createSocialPostSchema.safeParse({ section: formData.get('section') })
  if (!parsed.success) return jsonError('Pick a valid section for your post.', 400)

  const serviceClient = createServiceClient()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await serviceClient.storage
    .from(SOCIAL_POST_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })
  if (uploadError) return jsonError(uploadError.message, 500)

  const { data: publicUrl } = serviceClient.storage.from(SOCIAL_POST_BUCKET).getPublicUrl(storagePath)
  const { data, error } = await serviceClient
    .from('social_posts')
    .insert({
      user_id: user.id,
      image_url: publicUrl.publicUrl,
      storage_path: storagePath,
      section: parsed.data.section,
    })
    .select()
    .single()

  if (error) {
    await serviceClient.storage.from(SOCIAL_POST_BUCKET).remove([storagePath])
    return jsonError(error.message, 500)
  }

  return NextResponse.json(data, { status: 201 })
}
