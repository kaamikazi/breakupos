import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { jsonError, parseJson } from '@/lib/api'
import { notificationReadSchema } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const parsed = await parseJson(req, notificationReadSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', parsed.data.notification_id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return jsonError(error.message, 500)
  return NextResponse.json(data)
}
