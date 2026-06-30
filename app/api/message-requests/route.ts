import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getClientIp, jsonError, parseJson, rateLimit } from '@/lib/api'
import { buildNotification } from '@/lib/notifications'
import { canSendMessageRequest, messageRequestSchema } from '@/lib/social-profile'
import { logServerError } from '@/lib/logging'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const limit = await rateLimit(`message-request:${user.id}:${getClientIp(req)}`, 12, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Message request rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, messageRequestSchema)
  if (parsed.error) return parsed.error

  const receiverId = parsed.data.receiver_id
  const serviceClient = createServiceClient()

  const [{ data: pending }, { data: blocks }, { data: receiver }, { data: sourcePost }] = await Promise.all([
    serviceClient
      .from('message_requests')
      .select('id')
      .eq('sender_id', user.id)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .maybeSingle(),
    serviceClient
      .from('user_blocks')
      .select('blocker_user_id,blocked_user_id')
      .or(`and(blocker_user_id.eq.${user.id},blocked_user_id.eq.${receiverId}),and(blocker_user_id.eq.${receiverId},blocked_user_id.eq.${user.id})`),
    serviceClient
      .from('profiles')
      .select('id,display_name,public_profile_visible')
      .eq('id', receiverId)
      .maybeSingle(),
    parsed.data.source_post_id
      ? serviceClient
        .from('social_posts')
        .select('id,user_id,is_deleted')
        .eq('id', parsed.data.source_post_id)
        .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!receiver?.public_profile_visible) return jsonError('Profile not found.', 404)
  if (parsed.data.source_post_id && (!sourcePost || sourcePost.user_id !== receiverId || sourcePost.is_deleted)) {
    return jsonError('Source post not found.', 404)
  }

  const blocked = Boolean(blocks?.length)
  const verdict = canSendMessageRequest({
    senderId: user.id,
    receiverId,
    pendingExists: Boolean(pending),
    blocked,
  })
  if (!verdict.allowed) return jsonError(verdict.reason ?? 'Request not allowed.', 400)

  const { data: request, error } = await serviceClient
    .from('message_requests')
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      source_post_id: parsed.data.source_post_id ?? null,
      message_text: parsed.data.message_text ?? '',
    })
    .select('id')
    .single()

  if (error) {
    logServerError('Message request insert failed', {
      route: 'message-requests',
      operation: 'insert_request',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not send the message request right now.', 500)
  }

  await serviceClient.from('notifications').insert(buildNotification({
    user_id: receiverId,
    type: 'message_request',
    title: 'New message request',
    body: 'Someone wants to connect from Breakup OS social.',
    link_url: '/requests',
  }))

  return NextResponse.json({ id: request.id, status: 'pending' }, { status: 201 })
}
