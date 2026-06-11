import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { jsonError } from '@/lib/api'
import { SOCIAL_POST_BUCKET, canDeleteSocialPost } from '@/lib/social'

interface SocialPostRouteProps {
  params: Promise<{ id: string }>
}

const idSchema = z.string().uuid()

export async function DELETE(_req: NextRequest, { params }: SocialPostRouteProps) {
  const { id } = await params
  if (!idSchema.safeParse(id).success) return jsonError('Invalid post id.', 400)

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const serviceClient = createServiceClient()
  const { data: post } = await serviceClient
    .from('social_posts')
    .select('id,user_id,storage_path,is_deleted')
    .eq('id', id)
    .maybeSingle()

  if (!post || post.is_deleted) return jsonError('Post not found.', 404)
  if (!canDeleteSocialPost(post, user.id)) return jsonError('You can only delete your own posts.', 403)

  const { error } = await serviceClient
    .from('social_posts')
    .update({ is_deleted: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return jsonError(error.message, 500)

  // Best-effort storage cleanup; the soft-deleted row keeps the feed history consistent.
  if (post.storage_path) {
    await serviceClient.storage.from(SOCIAL_POST_BUCKET).remove([post.storage_path])
  }

  return NextResponse.json({ success: true })
}
