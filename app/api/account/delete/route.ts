import { NextRequest, NextResponse } from 'next/server'
import { jsonError, parseJson } from '@/lib/api'
import { PROFILE_PHOTO_BUCKET } from '@/lib/dating'
import { deleteAccountSchema, collectStoragePaths } from '@/lib/privacy'
import { SOCIAL_POST_BUCKET } from '@/lib/social'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

type MutationResult = { error: { message: string } | null }

function mutationError(result: MutationResult, fallback: string) {
  return result.error ? jsonError(fallback, 500) : null
}

async function deleteAccountRows(userId: string) {
  const serviceClient = createServiceClient()

  const [{ data: uploadedPhotos }, { data: socialPosts }, { data: matches }] = await Promise.all([
    serviceClient
      .from('profile_photos')
      .select('storage_path')
      .eq('user_id', userId)
      .not('storage_path', 'is', null),
    serviceClient
      .from('social_posts')
      .select('id,storage_path')
      .eq('user_id', userId),
    serviceClient
      .from('matches')
      .select('id')
      .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`),
  ])

  const profilePhotoPaths = collectStoragePaths(uploadedPhotos)
  const socialPostPaths = collectStoragePaths(socialPosts)

  if (profilePhotoPaths.length > 0) {
    const { error } = await serviceClient.storage.from(PROFILE_PHOTO_BUCKET).remove(profilePhotoPaths)
    if (error) return jsonError('Could not delete profile photo files.', 500)
  }

  if (socialPostPaths.length > 0) {
    const { error } = await serviceClient.storage.from(SOCIAL_POST_BUCKET).remove(socialPostPaths)
    if (error) return jsonError('Could not delete social post files.', 500)
  }

  const matchIds = (matches ?? []).map(match => match.id)
  const socialPostIds = (socialPosts ?? []).map(post => post.id)

  if (matchIds.length > 0) {
    const deletedMessages = await serviceClient.from('dating_messages').delete().in('match_id', matchIds)
    const messageError = mutationError(deletedMessages, 'Could not delete dating messages.')
    if (messageError) return messageError
  }

  if (socialPostIds.length > 0) {
    const deletedPostReactions = await serviceClient.from('social_post_reactions').delete().in('post_id', socialPostIds)
    const postReactionError = mutationError(deletedPostReactions, 'Could not delete social post reactions.')
    if (postReactionError) return postReactionError
  }

  const deletions: Array<() => Promise<MutationResult>> = [
    async () => serviceClient.from('social_post_reactions').delete().eq('user_id', userId),
    async () => serviceClient.from('message_requests').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
    async () => serviceClient.from('social_posts').delete().eq('user_id', userId),
    async () => serviceClient.from('notifications').delete().eq('user_id', userId),
    async () => serviceClient.from('user_reports').delete().or(`reporter_user_id.eq.${userId},reported_user_id.eq.${userId}`),
    async () => serviceClient.from('user_blocks').delete().or(`blocker_user_id.eq.${userId},blocked_user_id.eq.${userId}`),
    async () => serviceClient.from('profile_likes').delete().or(`liker_user_id.eq.${userId},liked_user_id.eq.${userId}`),
    async () => serviceClient.from('profile_passes').delete().or(`passer_user_id.eq.${userId},passed_user_id.eq.${userId}`),
    async () => serviceClient.from('matches').delete().or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`),
    async () => serviceClient.from('profile_photos').delete().eq('user_id', userId),
    async () => serviceClient.from('dating_profiles').delete().eq('user_id', userId),
    async () => serviceClient.from('ai_usage_events').delete().eq('user_id', userId),
    async () => serviceClient.from('credit_transactions').delete().eq('user_id', userId),
    async () => serviceClient.from('user_credits').delete().eq('user_id', userId),
    async () => serviceClient.from('ai_advice').delete().eq('user_id', userId),
    async () => serviceClient.from('relationship_reports').delete().eq('user_id', userId),
    async () => serviceClient.from('weekly_summaries').delete().eq('user_id', userId),
    async () => serviceClient.from('interactions').delete().eq('user_id', userId),
    async () => serviceClient.from('situations').delete().eq('user_id', userId),
    async () => serviceClient.from('profiles').delete().eq('id', userId),
  ]

  const results = await Promise.all(deletions.map(deleteRows => deleteRows()))
  const failed = results.find(result => result.error)
  if (failed?.error) return jsonError('Could not delete all account data.', 500)

  const { error: authError } = await serviceClient.auth.admin.deleteUser(userId)
  if (authError) return jsonError('Account data was removed, but the auth user could not be deleted. Contact support.', 500)

  return null
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const parsed = await parseJson(req, deleteAccountSchema)
  if (parsed.error) return parsed.error

  const error = await deleteAccountRows(user.id)
  if (error) return error

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
