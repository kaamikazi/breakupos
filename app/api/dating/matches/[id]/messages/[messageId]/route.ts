import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { jsonError } from '@/lib/api'
import { isMatchParticipant } from '@/lib/dating-chat'
import { logServerError } from '@/lib/logging'

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

  if (error) {
    logServerError('Dating message delete failed', {
      route: 'dating/matches/messages/[messageId]',
      operation: 'soft_delete_message',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not delete the message right now.', 500)
  }
  return NextResponse.json(data)
}
