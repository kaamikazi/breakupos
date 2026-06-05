import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { jsonError } from '@/lib/api'
import { isMatchParticipant } from '@/lib/dating-chat'

interface MessageRouteProps {
  params: Promise<{ id: string; messageId: string }>
}

export async function DELETE(_req: NextRequest, { params }: MessageRouteProps) {
  const { id, messageId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const serviceClient = createServiceClient()
  const { data: match } = await serviceClient.from('matches').select('*').eq('id', id).maybeSingle()
  if (!isMatchParticipant(match, user.id)) return jsonError('Match not found', 404)

  const { data: message } = await serviceClient
    .from('dating_messages')
    .select('*')
    .eq('id', messageId)
    .eq('match_id', id)
    .maybeSingle()

  if (!message) return jsonError('Message not found', 404)
  if (message.sender_id !== user.id) return jsonError('You can only delete your own messages.', 403)

  const { data, error } = await serviceClient
    .from('dating_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
    .select()
    .single()

  if (error) return jsonError(error.message, 500)
  return NextResponse.json(data)
}
