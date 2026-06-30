import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { datingActionSchema } from '@/lib/dating'
import { getClientIp, jsonError, parseJson, rateLimit } from '@/lib/api'
import { canBlockUser } from '@/lib/dating-chat'
import { logServerError } from '@/lib/logging'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const limit = await rateLimit(`dating-block:${user.id}:${getClientIp(req)}`, 30, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Block rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, datingActionSchema)
  if (parsed.error) return parsed.error
  if (!canBlockUser(user.id, parsed.data.target_user_id)) return jsonError('You cannot block your own profile.', 400)

  const serviceClient = createServiceClient()
  const { data: targetProfile, error: targetError } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('id', parsed.data.target_user_id)
    .maybeSingle()

  if (targetError) {
    logServerError('Block target lookup failed', {
      route: 'dating/block',
      operation: 'lookup_target',
      code: targetError.code ?? 'unknown',
      errorMessage: targetError.message,
      userId: user.id,
    })
    return jsonError('Could not block this profile right now.', 500)
  }
  if (!targetProfile) return jsonError('Profile not found.', 404)

  const { error } = await serviceClient
    .from('user_blocks')
    .upsert(
      { blocker_user_id: user.id, blocked_user_id: parsed.data.target_user_id },
      { onConflict: 'blocker_user_id,blocked_user_id' }
    )

  if (error) {
    logServerError('Block upsert failed', {
      route: 'dating/block',
      operation: 'upsert_block',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not block this profile right now.', 500)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const limit = await rateLimit(`dating-unblock:${user.id}:${getClientIp(req)}`, 30, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Unblock rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, datingActionSchema)
  if (parsed.error) return parsed.error
  if (parsed.data.target_user_id === user.id) return jsonError('You cannot unblock your own profile.', 400)

  const serviceClient = createServiceClient()
  const { error, count } = await serviceClient
    .from('user_blocks')
    .delete({ count: 'exact' })
    .eq('blocker_user_id', user.id)
    .eq('blocked_user_id', parsed.data.target_user_id)

  if (error) {
    logServerError('Unblock delete failed', {
      route: 'dating/block',
      operation: 'delete_block',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not unblock this profile right now.', 500)
  }
  if (count === 0) return jsonError('Block not found.', 404)

  return NextResponse.json({ ok: true })
}
