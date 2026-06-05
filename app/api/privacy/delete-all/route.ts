import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { jsonError, parseJson } from '@/lib/api'
import { deleteAllSchema } from '@/lib/privacy'
import { PROFILE_PHOTO_BUCKET } from '@/lib/dating'

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

  const notifications = await serviceClient.from('notifications').delete().eq('user_id', user.id)
  if (notifications.error) return jsonError(notifications.error.message, 500)

  const reports = await serviceClient
    .from('user_reports')
    .delete()
    .or(`reporter_user_id.eq.${user.id},reported_user_id.eq.${user.id}`)
  if (reports.error) return jsonError(reports.error.message, 500)

  const blocks = await serviceClient
    .from('user_blocks')
    .delete()
    .or(`blocker_user_id.eq.${user.id},blocked_user_id.eq.${user.id}`)
  if (blocks.error) return jsonError(blocks.error.message, 500)

  const likes = await serviceClient
    .from('profile_likes')
    .delete()
    .or(`liker_user_id.eq.${user.id},liked_user_id.eq.${user.id}`)
  if (likes.error) return jsonError(likes.error.message, 500)

  const passes = await serviceClient
    .from('profile_passes')
    .delete()
    .or(`passer_user_id.eq.${user.id},passed_user_id.eq.${user.id}`)
  if (passes.error) return jsonError(passes.error.message, 500)

  const matches = await serviceClient
    .from('matches')
    .delete()
    .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
  if (matches.error) return jsonError(matches.error.message, 500)

  const profilePhotos = await serviceClient.from('profile_photos').delete().eq('user_id', user.id)
  if (profilePhotos.error) return jsonError(profilePhotos.error.message, 500)

  const datingProfile = await serviceClient.from('dating_profiles').delete().eq('user_id', user.id)
  if (datingProfile.error) return jsonError(datingProfile.error.message, 500)

  const storagePaths = (uploadedPhotos ?? [])
    .map(photo => photo.storage_path)
    .filter((path): path is string => Boolean(path))
  if (storagePaths.length > 0) {
    await serviceClient.storage.from(PROFILE_PHOTO_BUCKET).remove(storagePaths)
  }

  const advice = await serviceClient.from('ai_advice').delete().eq('user_id', user.id)
  if (advice.error) return jsonError(advice.error.message, 500)

  const relationshipReports = await serviceClient.from('relationship_reports').delete().eq('user_id', user.id)
  if (relationshipReports.error) return jsonError(relationshipReports.error.message, 500)

  const weeklySummaries = await serviceClient.from('weekly_summaries').delete().eq('user_id', user.id)
  if (weeklySummaries.error) return jsonError(weeklySummaries.error.message, 500)

  const interactions = await serviceClient.from('interactions').delete().eq('user_id', user.id)
  if (interactions.error) return jsonError(interactions.error.message, 500)

  const situations = await serviceClient.from('situations').delete().eq('user_id', user.id)
  if (situations.error) return jsonError(situations.error.message, 500)

  const profile = await serviceClient
    .from('profiles')
    .update({ situations_count: 0, ai_advice_used: 0 })
    .eq('id', user.id)

  if (profile.error) return jsonError(profile.error.message, 500)

  return NextResponse.json({ success: true })
}
