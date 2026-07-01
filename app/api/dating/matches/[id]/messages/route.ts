import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { chatMessageSchema, chatPaginationSchema, canSendMessage, getMessageSpamVerdict, getOtherParticipantId, isMatchParticipant, maskDeletedMessageBody } from '@/lib/dating-chat'
import { getClientIp, jsonError, parseJson, rateLimit } from '@/lib/api'
import { buildNotification } from '@/lib/notifications'
import { logServerError } from '@/lib/logging'

interface MessagesRouteProps {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: MessagesRouteProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const serviceClient = createServiceClient()
  const { data: match } = await serviceClient.from('matches').select('*').eq('id', id).maybeSingle()
  if (!isMatchParticipant(match, user.id)) return jsonError('Match not found', 404)

  const url = new URL(req.url)
  const parsed = chatPaginationSchema.safeParse({
    before: url.searchParams.get('before') || undefined,
    limit: url.searchParams.get('limit') || undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  let query = serviceClient
    .from('dating_messages')
    .select('*')
    .eq('match_id', id)
    .order('created_at', { ascending: false })
    .limit(parsed.data.limit)

  if (parsed.data.before) query = query.lt('created_at', parsed.data.before)

  const { data, error } = await query
  if (error) {
    logServerError('Dating messages query failed', {
      route: 'dating/matches/messages',
      operation: 'list_messages',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not load messages right now.', 500)
  }

  await serviceClient
    .from('dating_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('match_id', id)
    .neq('sender_id', user.id)
    .is('read_at', null)
    .is('deleted_at', null)

  return NextResponse.json([...(data ?? [])].reverse().map(maskDeletedMessageBody))
}

export async function POST(req: NextRequest, { params }: MessagesRouteProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const limit = await rateLimit(`dating-message:${user.id}:${getClientIp(req)}`, 120, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Message rate limit reached. Try again later.', 429)

  const matchBurstLimit = await rateLimit(`dating-message-match:${user.id}:${id}`, 20, 10 * 60 * 1000)
  if (matchBurstLimit.limited) return jsonError('You are sending messages too quickly in this chat. Take a short pause and try again.', 429)

  const parsed = await parseJson(req, chatMessageSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const { data: match } = await serviceClient.from('matches').select('*').eq('id', id).maybeSingle()
  const otherUserId = match ? getOtherParticipantId(match, user.id) : null
  if (!isMatchParticipant(match, user.id) || !otherUserId) return jsonError('Match not found', 404)

  const { data: blocks } = await serviceClient
    .from('user_blocks')
    .select('blocker_user_id,blocked_user_id')
    .or(`and(blocker_user_id.eq.${user.id},blocked_user_id.eq.${otherUserId}),and(blocker_user_id.eq.${otherUserId},blocked_user_id.eq.${user.id})`)

  if (!canSendMessage({ match, userId: user.id, otherUserId, blocks })) {
    return jsonError('Messaging is disabled because one of you blocked the other.', 403)
  }

  const { data: recentMessages } = await serviceClient
    .from('dating_messages')
    .select('body,sender_id,created_at')
    .eq('match_id', id)
    .eq('sender_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const spam = getMessageSpamVerdict(parsed.data.body, recentMessages ?? [], user.id)
  if (!spam.allowed) return jsonError(spam.reason ?? 'Message blocked by anti-spam rules.', 400)

  const { data, error } = await serviceClient
    .from('dating_messages')
    .insert({ match_id: id, sender_id: user.id, body: parsed.data.body })
    .select()
    .single()

  if (error) {
    logServerError('Dating message insert failed', {
      route: 'dating/matches/messages',
      operation: 'insert_message',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not send the message right now.', 500)
  }

  await serviceClient
    .from('matches')
    .update({ last_message_at: data.created_at, last_activity_at: data.created_at })
    .eq('id', id)

  await serviceClient.from('notifications').insert(buildNotification({
    user_id: otherUserId,
    type: 'new_message',
    title: 'New dating message',
    body: 'You have a new message from a match.',
    link_url: `/matches/${id}`,
  }))

  return NextResponse.json(data, { status: 201 })
}
