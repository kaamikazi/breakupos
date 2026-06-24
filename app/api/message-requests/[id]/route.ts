import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getClientIp, jsonError, parseJson, rateLimit } from '@/lib/api'
import { getOrderedMatchPair } from '@/lib/dating'
import { buildNotification } from '@/lib/notifications'
import { messageRequestActionSchema, requestActionToStatus } from '@/lib/social-profile'

interface RequestRouteProps {
  params: Promise<{ id: string }>
}

const idSchema = z.string().uuid()

export async function PATCH(req: NextRequest, { params }: RequestRouteProps) {
  const { id } = await params
  if (!idSchema.safeParse(id).success) return jsonError('Invalid request id.', 400)

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const limit = await rateLimit(`message-request-action:${user.id}:${getClientIp(req)}`, 60, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Request action rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, messageRequestActionSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const { data: request } = await serviceClient
    .from('message_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!request || request.receiver_id !== user.id) return jsonError('Request not found.', 404)
  if (request.status !== 'pending') return jsonError('This request is already handled.', 409)

  const status = requestActionToStatus(parsed.data.action)
  const { error } = await serviceClient
    .from('message_requests')
    .update({ status })
    .eq('id', id)
    .eq('receiver_id', user.id)

  if (error) return jsonError(error.message, 500)

  if (parsed.data.action === 'block') {
    await serviceClient
      .from('user_blocks')
      .upsert(
        { blocker_user_id: user.id, blocked_user_id: request.sender_id },
        { onConflict: 'blocker_user_id,blocked_user_id' }
      )
    return NextResponse.json({ status, match_id: null })
  }

  if (parsed.data.action === 'accept') {
    const [userOneId, userTwoId] = getOrderedMatchPair(user.id, request.sender_id)
    const { data: match, error: matchError } = await serviceClient
      .from('matches')
      .upsert(
        { user_one_id: userOneId, user_two_id: userTwoId, last_activity_at: new Date().toISOString() },
        { onConflict: 'user_one_id,user_two_id' }
      )
      .select('id')
      .single()

    if (matchError) return jsonError(matchError.message, 500)

    await serviceClient.from('notifications').insert(buildNotification({
      user_id: request.sender_id,
      type: 'new_match',
      title: 'Message request accepted',
      body: 'Your message request was accepted. You can chat now.',
      link_url: `/matches/${match.id}`,
    }))

    return NextResponse.json({ status, match_id: match.id })
  }

  return NextResponse.json({ status, match_id: null })
}
