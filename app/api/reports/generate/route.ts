import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getClientIp, jsonError, parseJson, rateLimit } from '@/lib/api'
import { isProUser } from '@/lib/premium'
import { anthropic, extractText } from '@/lib/anthropic'
import { calculateCompatibilityBreakdown } from '@/lib/compatibility'
import { buildRelationshipReportHtml } from '@/lib/reports'
import { fallbackReportSummary, reportAiSchema, reportRequestSchema } from '@/lib/report-summary'
import type { Interaction, Situation } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)
  if (!(await isProUser(user.id))) return jsonError('Relationship Reports are a Pro feature.', 403)

  const limit = rateLimit(`report:${user.id}:${getClientIp(req)}`, 10, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Report generation rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, reportRequestSchema)
  if (parsed.error) return parsed.error

  const serviceClient = createServiceClient()
  const [{ data: situation }, { data: interactions }] = await Promise.all([
    serviceClient
      .from('situations')
      .select('*')
      .eq('id', parsed.data.situation_id)
      .eq('user_id', user.id)
      .single(),
    serviceClient
      .from('interactions')
      .select('*')
      .eq('situation_id', parsed.data.situation_id)
      .eq('user_id', user.id)
      .order('date', { ascending: false }),
  ])

  if (!situation) return jsonError('Situation not found', 404)

  const sit = situation as Situation
  const ints = (interactions ?? []) as Interaction[]
  let ai = fallbackReportSummary(sit, ints)

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const breakdown = calculateCompatibilityBreakdown(sit, ints)
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: 'Create concise relationship report content for BreakupOS. Return strict JSON with keys summary string and recommended_next_steps string[]. Avoid diagnosis. Include practical, safety-aware advice.',
        messages: [{
          role: 'user',
          content: JSON.stringify({
            situation: sit,
            recent_interactions: ints.slice(0, 20),
            compatibility_breakdown: breakdown,
          }),
        }],
      })
      const text = extractText(message) || '{}'
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start === -1 || end < start) throw new Error('No JSON in AI response')
      const json = JSON.parse(text.slice(start, end + 1))
      const validated = reportAiSchema.safeParse(json)
      if (validated.success) ai = validated.data
    } catch {
      ai = fallbackReportSummary(sit, ints)
    }
  }

  const contentHtml = buildRelationshipReportHtml(sit, ints, ai.summary, ai.recommended_next_steps)

  const { data: report, error } = await serviceClient
    .from('relationship_reports')
    .insert({
      user_id: user.id,
      situation_id: sit.id,
      title: `${sit.name} Relationship Report`,
      summary: ai.summary,
      recommended_next_steps: ai.recommended_next_steps,
      content_html: contentHtml,
    })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  return NextResponse.json({
    id: report.id,
    url: `/reports/${report.id}`,
    summary: report.summary,
  }, { status: 201 })
}
