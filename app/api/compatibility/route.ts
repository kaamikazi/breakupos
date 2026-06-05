import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { calculateCompatibility } from '@/lib/compatibility'
import { jsonError, parseJson } from '@/lib/api'

const schema = z.object({ situation_id: z.string().uuid() })

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const parsed = await parseJson(req, schema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const { data: situation } = await serviceClient
    .from('situations')
    .select('*')
    .eq('id', parsed.data.situation_id)
    .eq('user_id', user.id)
    .single()

  if (!situation) return jsonError('Not found', 404)

  const { data: interactions } = await serviceClient
    .from('interactions')
    .select('type, date, sentiment')
    .eq('situation_id', parsed.data.situation_id)
    .eq('user_id', user.id)

  const score = calculateCompatibility(situation, interactions ?? [])

  await serviceClient
    .from('situations')
    .update({ compatibility: score })
    .eq('id', parsed.data.situation_id)

  return NextResponse.json({ score })
}
