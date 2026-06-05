import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { checkSituationsQuota, ensureProfileForUser } from '@/lib/quota'
import { calculateCompatibility } from '@/lib/compatibility'
import { CONTACT_METHOD_VALUES, FIELD_LIMITS, STAGE_VALUES, VIBE_VALUES } from '@/lib/domain'
import { jsonError, parseJson } from '@/lib/api'

const createSituationSchema = z.object({
  name: z.string().trim().min(1).max(FIELD_LIMITS.name),
  avatar_emoji: z.string().trim().max(16).default('🧑'),
  stage: z.enum(STAGE_VALUES).default('orbiting'),
  emotional_invest: z.number().int().min(1).max(10).default(5),
  first_contact: z.string().nullable().optional(),
  vibe: z.enum(VIBE_VALUES).default('warm'),
  contact_method: z.enum(CONTACT_METHOD_VALUES).default('irl'),
  notes: z.string().max(FIELD_LIMITS.privateNotes).optional().default(''),
  is_breakup_mode: z.boolean().optional().default(false),
  no_contact_started: z.string().nullable().optional(),
  no_contact_reasons: z.array(z.string().trim().max(FIELD_LIMITS.reason)).max(50).optional().default([]),
  recovery_milestones: z.array(z.string().trim().max(FIELD_LIMITS.milestone)).max(50).optional().default([]),
  memory_summary: z.string().max(1000).nullable().optional(),
  private_vault: z.string().max(FIELD_LIMITS.privateVault).optional().default(''),
})

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const { data, error } = await supabase
    .from('situations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return jsonError(error.message, 500)
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  await ensureProfileForUser(user)

  const canCreate = await checkSituationsQuota(user.id)
  if (!canCreate) {
    return jsonError('Situation limit reached. Upgrade to Pro for unlimited situations.', 403)
  }

  const parsed = await parseJson(req, createSituationSchema)
  if (parsed.error) return parsed.error

  const compatibility = calculateCompatibility(
    { red_flags: [], green_flags: [], emotional_invest: parsed.data.emotional_invest, stage: parsed.data.stage },
    []
  )

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('situations')
    .insert({
      ...parsed.data,
      user_id: user.id,
      compatibility,
    })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)
  return NextResponse.json(data, { status: 201 })
}
