import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { datingActionSchema } from '@/lib/dating'
import { getClientIp, jsonError, parseJson, rateLimit } from '@/lib/api'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const limit = await rateLimit(`dating-block:${user.id}:${getClientIp(req)}`, 30, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Block rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, datingActionSchema)
  if (parsed.error) return parsed.error
  if (parsed.data.target_user_id === user.id) return jsonError('You cannot block your own profile.', 400)

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('user_blocks')
    .upsert(
      { blocker_user_id: user.id, blocked_user_id: parsed.data.target_user_id },
      { onConflict: 'blocker_user_id,blocked_user_id' }
    )

  if (error) return jsonError(error.message, 500)

  return NextResponse.json({ ok: true })
}
