import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { STAGE_VALUES } from '@/lib/domain'
import { jsonError, parseJson } from '@/lib/api'

const stageSchema = z.object({
  stage: z.enum(STAGE_VALUES),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const parsed = await parseJson(req, stageSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const { data: current } = await serviceClient
    .from('situations')
    .select('stage')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!current) return jsonError('Not found', 404)

  const updates: {
    stage: string
    is_breakup_mode?: boolean
    no_contact_started?: string
  } = { stage: parsed.data.stage }

  if (parsed.data.stage === 'no_contact') {
    updates.is_breakup_mode = true
    updates.no_contact_started = new Date().toISOString().split('T')[0]
  }

  const { data, error } = await serviceClient
    .from('situations')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  if (current.stage !== parsed.data.stage) {
    await serviceClient.from('interactions').insert({
      situation_id: id,
      user_id: user.id,
      type: 'stage_change',
      sentiment: 'neutral',
      note: `Moved from ${current.stage} to ${parsed.data.stage}`,
      date: new Date().toISOString().split('T')[0],
    })
  }

  return NextResponse.json(data)
}
