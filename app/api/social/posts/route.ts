import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getClientIp, jsonError, rateLimit } from '@/lib/api'
import { ensureProfileForUser } from '@/lib/quota'
import {
  SOCIAL_FEED_PAGE_SIZE,
  SOCIAL_POST_BUCKET,
  buildSafeSocialFeedPayload,
  createSocialPostSchema,
  socialFeedQuerySchema,
  validateUploadedImageFile,
  type SocialPostRow,
  type SocialReactionRow,
} from '@/lib/social'
import { logServerError } from '@/lib/logging'

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
    .select('id,user_id,image_url,section,created_at,profiles(id,public_display_name,display_name,username,avatar_url,public_profile_visible)')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(SOCIAL_FEED_PAGE_SIZE)

  if (parsed.data.section) query = query.eq('section', parsed.data.section)
  if (parsed.data.before) query = query.lt('created_at', parsed.data.before)

  let { data: posts, error } = await query
  if (error && /public_display_name|username|avatar_url/i.test(error.message)) {
    const profileFallbackQuery = serviceClient
      .from('social_posts')
      .select('id,user_id,image_url,section,created_at,profiles(id,display_name,username,avatar_url,public_profile_visible)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(SOCIAL_FEED_PAGE_SIZE)

    let scopedFallbackQuery = profileFallbackQuery
    if (parsed.data.section) scopedFallbackQuery = scopedFallbackQuery.eq('section', parsed.data.section)
    if (parsed.data.before) scopedFallbackQuery = scopedFallbackQuery.lt('created_at', parsed.data.before)

    const fallback = await scopedFallbackQuery
    posts = fallback.data as typeof posts
    error = fallback.error
  }
  if (error && /public_display_name|username|avatar_url/i.test(error.message)) {
    const minimalFallbackQuery = serviceClient
      .from('social_posts')
      .select('id,user_id,image_url,section,created_at,profiles(id,display_name,public_profile_visible)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(SOCIAL_FEED_PAGE_SIZE)

    let scopedMinimalFallbackQuery = minimalFallbackQuery
    if (parsed.data.section) scopedMinimalFallbackQuery = scopedMinimalFallbackQuery.eq('section', parsed.data.section)
    if (parsed.data.before) scopedMinimalFallbackQuery = scopedMinimalFallbackQuery.lt('created_at', parsed.data.before)

    const fallback = await scopedMinimalFallbackQuery
    posts = fallback.data as typeof posts
    error = fallback.error
  }
  if (error) {
    logServerError('Social feed query failed', {
      route: 'social/posts',
      operation: 'list_posts',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
    })
    return jsonError('Could not load social posts right now.', 500)
  }

  const postIds = (posts ?? []).map(post => post.id)
  let reactions: SocialReactionRow[] = []
  if (postIds.length > 0) {
    const { data: reactionRows, error: reactionsError } = await serviceClient
      .from('social_post_reactions')
      .select('post_id,user_id,reaction_type')
      .in('post_id', postIds)
    if (reactionsError) {
      logServerError('Social feed reactions query failed', {
        route: 'social/posts',
        operation: 'list_reactions',
        code: reactionsError.code ?? 'unknown',
        errorMessage: reactionsError.message,
      })
      return jsonError('Could not load social reactions right now.', 500)
    }
    reactions = reactionRows ?? []
  }

  const payload = buildSafeSocialFeedPayload((posts ?? []) as SocialPostRow[], reactions, user.id)

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
  const validation = await validateUploadedImageFile(file instanceof File ? file : null)
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
  if (uploadError) {
    logServerError('Social post upload failed', {
      route: 'social/posts',
      operation: 'upload_photo',
      code: 'storage_upload_failed',
      errorMessage: uploadError.message,
      userId: user.id,
    })
    return jsonError('Could not upload the photo right now.', 500)
  }

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
    logServerError('Social post insert failed', {
      route: 'social/posts',
      operation: 'insert_post',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not create the post right now.', 500)
  }

  return NextResponse.json(data, { status: 201 })
}
