import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { calculateCompatibility } from '@/lib/compatibility'
import { FIELD_LIMITS, INTERACTION_TYPE_VALUES } from '@/lib/domain'
import { jsonError, parseJson } from '@/lib/api'

const createInteractionSchema = z.object({
  situation_id: z.string().uuid(),
  type: z.enum(INTERACTION_TYPE_VALUES),
  note: z.string().trim().max(FIELD_LIMITS.note).optional().default(''),
  sentiment: z.enum(['positive', 'neutral', 'negative']).default('neutral'),
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const parsed = await parseJson(req, createInteractionSchema)
  if (parsed.error) return parsed.error

  // Verify the situation belongs to this user
  const serviceClient = createServiceClient()
  const { data: situation } = await serviceClient
    .from('situations')
    .select('*')
    .eq('id', parsed.data.situation_id)
    .eq('user_id', user.id)
    .single()

  if (!situation) return jsonError('Not found', 404)

  const { data: interaction, error } = await serviceClient
    .from('interactions')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  // Update last_interaction and recalculate compatibility
  const { data: allInteractions } = await serviceClient
    .from('interactions')
    .select('type, date, sentiment')
    .eq('situation_id', parsed.data.situation_id)

  const compatibility = calculateCompatibility(situation, allInteractions ?? [])

  await serviceClient
    .from('situations')
    .update({
      last_interaction: parsed.data.date,
      compatibility,
    })
    .eq('id', parsed.data.situation_id)

  return NextResponse.json(interaction, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const situationId = searchParams.get('situation_id')

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)
  if (!situationId) return jsonError('situation_id required', 400)

  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('situation_id', situationId)
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) return jsonError(error.message, 500)
  return NextResponse.json(data)
}
