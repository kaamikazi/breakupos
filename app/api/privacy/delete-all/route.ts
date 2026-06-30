import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { jsonError, parseJson } from '@/lib/api'
import { deleteAllSchema } from '@/lib/privacy'
import { PROFILE_PHOTO_BUCKET } from '@/lib/dating'
import { SOCIAL_POST_BUCKET } from '@/lib/social'
import { logServerError } from '@/lib/logging'

function safeCleanupError(operation: string, error: { code?: string | null; message?: string | null }, userId: string) {
  logServerError('Privacy delete-all cleanup failed', {
    route: 'privacy/delete-all',
    operation,
    code: error.code ?? 'unknown',
    errorMessage: error.message ?? 'Unknown Supabase error',
    userId,
  })
  return jsonError('Could not delete all data right now. Please try again.', 500)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const parsed = await parseJson(req, deleteAllSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const { data: uploadedPhotos } = await serviceClient
    .from('profile_photos')
    .select('storage_path')
    .eq('user_id', user.id)
    .not('storage_path', 'is', null)

  const { data: socialPosts } = await serviceClient
    .from('social_posts')
    .select('id,storage_path')
    .eq('user_id', user.id)

  const { data: matchesForUser } = await serviceClient
    .from('matches')
    .select('id')
    .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)

  const socialPostIds = (socialPosts ?? []).map(post => post.id)
  const matchIds = (matchesForUser ?? []).map(match => match.id)

  const socialReactionsByUser = await serviceClient.from('social_post_reactions').delete().eq('user_id', user.id)
  if (socialReactionsByUser.error) return safeCleanupError('delete_social_reactions_by_user', socialReactionsByUser.error, user.id)

  if (socialPostIds.length > 0) {
    const socialReactionsByPost = await serviceClient.from('social_post_reactions').delete().in('post_id', socialPostIds)
    if (socialReactionsByPost.error) return safeCleanupError('delete_social_reactions_by_post', socialReactionsByPost.error, user.id)
  }

  const messageRequests = await serviceClient
    .from('message_requests')
    .delete()
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
  if (messageRequests.error) return safeCleanupError('delete_message_requests', messageRequests.error, user.id)

  const datingMessagesBySender = await serviceClient.from('dating_messages').delete().eq('sender_id', user.id)
  if (datingMessagesBySender.error) return safeCleanupError('delete_dating_messages_by_sender', datingMessagesBySender.error, user.id)

  if (matchIds.length > 0) {
    const datingMessagesByMatch = await serviceClient.from('dating_messages').delete().in('match_id', matchIds)
    if (datingMessagesByMatch.error) return safeCleanupError('delete_dating_messages_by_match', datingMessagesByMatch.error, user.id)
  }

  const notifications = await serviceClient.from('notifications').delete().eq('user_id', user.id)
  if (notifications.error) return safeCleanupError('delete_notifications', notifications.error, user.id)

  const reports = await serviceClient
    .from('user_reports')
    .delete()
    .or(`reporter_user_id.eq.${user.id},reported_user_id.eq.${user.id}`)
  if (reports.error) return safeCleanupError('delete_reports', reports.error, user.id)

  const blocks = await serviceClient
    .from('user_blocks')
    .delete()
    .or(`blocker_user_id.eq.${user.id},blocked_user_id.eq.${user.id}`)
  if (blocks.error) return safeCleanupError('delete_blocks', blocks.error, user.id)

  const likes = await serviceClient
    .from('profile_likes')
    .delete()
    .or(`liker_user_id.eq.${user.id},liked_user_id.eq.${user.id}`)
  if (likes.error) return safeCleanupError('delete_likes', likes.error, user.id)

  const passes = await serviceClient
    .from('profile_passes')
    .delete()
    .or(`passer_user_id.eq.${user.id},passed_user_id.eq.${user.id}`)
  if (passes.error) return safeCleanupError('delete_passes', passes.error, user.id)

  const matches = await serviceClient
    .from('matches')
    .delete()
    .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
  if (matches.error) return safeCleanupError('delete_matches', matches.error, user.id)

  const socialPostsDelete = await serviceClient.from('social_posts').delete().eq('user_id', user.id)
  if (socialPostsDelete.error) return safeCleanupError('delete_social_posts', socialPostsDelete.error, user.id)

  const profilePhotos = await serviceClient.from('profile_photos').delete().eq('user_id', user.id)
  if (profilePhotos.error) return safeCleanupError('delete_profile_photos', profilePhotos.error, user.id)

  const datingProfile = await serviceClient.from('dating_profiles').delete().eq('user_id', user.id)
  if (datingProfile.error) return safeCleanupError('delete_dating_profile', datingProfile.error, user.id)

  const storagePaths = (uploadedPhotos ?? [])
    .map(photo => photo.storage_path)
    .filter((path): path is string => Boolean(path))
  if (storagePaths.length > 0) {
    await serviceClient.storage.from(PROFILE_PHOTO_BUCKET).remove(storagePaths)
  }

  const socialStoragePaths = (socialPosts ?? [])
    .map(post => post.storage_path)
    .filter((path): path is string => Boolean(path))
  if (socialStoragePaths.length > 0) {
    await serviceClient.storage.from(SOCIAL_POST_BUCKET).remove(socialStoragePaths)
  }

  const advice = await serviceClient.from('ai_advice').delete().eq('user_id', user.id)
  if (advice.error) return safeCleanupError('delete_ai_advice', advice.error, user.id)

  const relationshipReports = await serviceClient.from('relationship_reports').delete().eq('user_id', user.id)
  if (relationshipReports.error) return safeCleanupError('delete_relationship_reports', relationshipReports.error, user.id)

  const weeklySummaries = await serviceClient.from('weekly_summaries').delete().eq('user_id', user.id)
  if (weeklySummaries.error) return safeCleanupError('delete_weekly_summaries', weeklySummaries.error, user.id)

  const interactions = await serviceClient.from('interactions').delete().eq('user_id', user.id)
  if (interactions.error) return safeCleanupError('delete_interactions', interactions.error, user.id)

  const situations = await serviceClient.from('situations').delete().eq('user_id', user.id)
  if (situations.error) return safeCleanupError('delete_situations', situations.error, user.id)

  const profile = await serviceClient
    .from('profiles')
    .update({ situations_count: 0, ai_advice_used: 0 })
    .eq('id', user.id)

  if (profile.error) return safeCleanupError('reset_profile_counters', profile.error, user.id)

  return NextResponse.json({ success: true })
}
