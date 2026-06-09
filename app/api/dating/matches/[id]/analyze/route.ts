import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getClientIp, jsonError, rateLimit } from '@/lib/api'
import { getOtherParticipantId, isMatchParticipant } from '@/lib/dating-chat'
import { analyzeDatingChat } from '@/lib/dating-premium'
import { isProUser } from '@/lib/premium'

interface AnalyzeRouteProps {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: AnalyzeRouteProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)
  if (!(await isProUser(user.id))) return jsonError('Dating chat analysis is a Pro feature.', 403)

  const limit = await rateLimit(`dating-chat-analysis:${user.id}:${getClientIp(req)}`, 20, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Chat analysis rate limit reached. Try again later.', 429)

  const serviceClient = createServiceClient()
  const { data: match } = await serviceClient.from('matches').select('*').eq('id', id).maybeSingle()
  const otherUserId = match ? getOtherParticipantId(match, user.id) : null
  if (!isMatchParticipant(match, user.id) || !otherUserId) return jsonError('Match not found', 404)

  const { data: messages, error } = await serviceClient
    .from('dating_messages')
    .select('*')
    .eq('match_id', id)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ analysis: analyzeDatingChat(messages ?? []), disclaimer: 'AI can be wrong. Treat this as a reflective prompt, not proof.' })
}
