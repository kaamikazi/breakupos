import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { calculateCompatibility } from '@/lib/compatibility'
import { CONTACT_METHOD_VALUES, FIELD_LIMITS, STAGE_VALUES, VIBE_VALUES } from '@/lib/domain'
import { jsonError, parseJson } from '@/lib/api'

const updateSituationSchema = z.object({
  name: z.string().trim().min(1).max(FIELD_LIMITS.name).optional(),
  avatar_emoji: z.string().trim().max(16).optional(),
  stage: z.enum(STAGE_VALUES).optional(),
  emotional_invest: z.number().int().min(1).max(10).optional(),
  first_contact: z.string().nullable().optional(),
  last_interaction: z.string().nullable().optional(),
  vibe: z.enum(VIBE_VALUES).optional(),
  red_flags: z.array(z.string().trim().min(1).max(FIELD_LIMITS.flag)).max(100).optional(),
  green_flags: z.array(z.string().trim().min(1).max(FIELD_LIMITS.flag)).max(100).optional(),
  notes: z.string().max(FIELD_LIMITS.privateNotes).optional(),
  contact_method: z.enum(CONTACT_METHOD_VALUES).optional(),
  is_archived: z.boolean().optional(),
  is_breakup_mode: z.boolean().optional(),
  no_contact_started: z.string().nullable().optional(),
  no_contact_reasons: z.array(z.string().trim().min(1).max(FIELD_LIMITS.reason)).max(50).optional(),
  recovery_milestones: z.array(z.string().trim().min(1).max(FIELD_LIMITS.milestone)).max(50).optional(),
  memory_summary: z.string().max(1000).nullable().optional(),
  private_vault: z.string().max(FIELD_LIMITS.privateVault).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const { data, error } = await supabase
    .from('situations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return jsonError('Not found', 404)
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const parsed = await parseJson(req, updateSituationSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const { data: current } = await serviceClient
    .from('situations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!current) return jsonError('Not found', 404)

  const { data: interactions } = await serviceClient
    .from('interactions')
    .select('type, date, sentiment')
    .eq('situation_id', id)
    .eq('user_id', user.id)

  const merged = { ...current, ...parsed.data }
  const compatibility = calculateCompatibility(merged, interactions ?? [])

  const { data, error } = await serviceClient
    .from('situations')
    .update({ ...parsed.data, compatibility })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  if (parsed.data.stage && parsed.data.stage !== current.stage) {
    await serviceClient.from('interactions').insert({
      situation_id: id,
      user_id: user.id,
      type: 'stage_change',
      sentiment: parsed.data.stage === 'no_contact' || parsed.data.stage === 'red_flag_hold' ? 'neutral' : 'positive',
      note: `Moved from ${current.stage} to ${parsed.data.stage}`,
      date: new Date().toISOString().split('T')[0],
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)
  if (req.headers.get('x-breakupos-confirm-delete') !== 'situation') {
    return jsonError('Missing delete confirmation header', 400)
  }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('situations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ success: true })
}
