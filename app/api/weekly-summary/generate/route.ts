import { NextRequest, NextResponse } from 'next/server'
import { subDays, formatISO } from 'date-fns'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getClientIp, jsonError, parseJson, productionAiRateLimitGuard, rateLimit } from '@/lib/api'
import { isProUser } from '@/lib/premium'
import { anthropic, extractText } from '@/lib/anthropic'
import { fallbackWeeklySummary, summaryRequestSchema, weeklyAiSchema } from '@/lib/weekly-summary'
import { buildNotification } from '@/lib/notifications'
import type { Interaction, Situation } from '@/types'
import { logServerError } from '@/lib/logging'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)
  if (!(await isProUser(user.id))) return jsonError('Weekly AI Coach Summary is a Pro feature.', 403)

  const productionGuard = productionAiRateLimitGuard('weekly-summary', user.id)
  if (productionGuard) return productionGuard

  const limit = await rateLimit(`weekly:${user.id}:${getClientIp(req)}`, 8, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Weekly summary rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, summaryRequestSchema)
  if (parsed.error) return parsed.error

  const weekEnd = parsed.data.week_end ?? formatISO(new Date(), { representation: 'date' })
  const weekStart = parsed.data.week_start ?? formatISO(subDays(new Date(), 6), { representation: 'date' })
  const serviceClient = createServiceClient()

  const [{ data: situations }, { data: interactions }] = await Promise.all([
    serviceClient.from('situations').select('*').eq('user_id', user.id),
    serviceClient
      .from('interactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .order('date', { ascending: false }),
  ])

  const sits = (situations ?? []) as Situation[]
  const ints = (interactions ?? []) as Interaction[]
  let summary = fallbackWeeklySummary(sits, ints)

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: 'Generate a weekly coaching summary for BreakupOS. Return strict JSON with emotional_trend, biggest_red_flag, healthiest_connection, most_draining_situation, no_contact_progress, suggested_focus, summary. Be concise, practical, and safety-aware.',
        messages: [{
          role: 'user',
          content: JSON.stringify({
            week_start: weekStart,
            week_end: weekEnd,
            situations: sits,
            interactions: ints,
          }),
        }],
      })
      const text = extractText(message) || '{}'
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start === -1 || end < start) throw new Error('No JSON in AI response')
      const json = JSON.parse(text.slice(start, end + 1))
      const validated = weeklyAiSchema.safeParse(json)
      if (validated.success) summary = validated.data
    } catch {
      summary = fallbackWeeklySummary(sits, ints)
    }
  }

  const { data, error } = await serviceClient
    .from('weekly_summaries')
    .upsert({
      user_id: user.id,
      week_start: weekStart,
      week_end: weekEnd,
      ...summary,
    }, { onConflict: 'user_id,week_start,week_end' })
    .select()
    .single()

  if (error) {
    logServerError('Weekly summary save failed', {
      route: 'weekly-summary/generate',
      operation: 'upsert_weekly_summary',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not save the weekly summary right now.', 500)
  }
  await serviceClient.from('notifications').insert(buildNotification({
    user_id: user.id,
    type: 'weekly_summary',
    title: 'Weekly coach summary ready',
    body: 'Your latest weekly AI coach summary has been generated.',
    link_url: '/dashboard',
  }))
  return NextResponse.json(data, { status: 201 })
}
