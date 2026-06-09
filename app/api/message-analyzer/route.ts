import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { anthropic, extractText, SAFETY_DISCLAIMER } from '@/lib/anthropic'
import { getClientIp, jsonError, parseJson, rateLimit } from '@/lib/api'
import { analysisSchema, analyzerInputSchema, fallbackAnalysis } from '@/lib/message-analysis'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const limit = rateLimit(`analyzer:${user.id}:${getClientIp(req)}`, 20, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Message analyzer rate limit reached. Try again later.', 429)

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (profile?.plan !== 'pro') {
    return jsonError('Message Analyzer is a Pro feature.', 403)
  }

  const parsed = await parseJson(req, analyzerInputSchema)
  if (parsed.error) return parsed.error

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(fallbackAnalysis(parsed.data.message_text))
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `Analyze relationship messages for BreakupOS. Return strict JSON with keys: interestLevel number 0-100, mixedSignals string[], avoidantBehavior string[], redFlags string[], recommendedReply string, confidence number 0-100, explanation string. Flag abuse, stalking, threats, harassment, self-harm, and crisis risk clearly. Safety note when relevant: ${SAFETY_DISCLAIMER}`,
      messages: [{
        role: 'user',
        content: `Context: ${parsed.data.context || 'none'}\n\nConversation:\n${parsed.data.message_text}`,
      }],
    })
    const text = extractText(message) || '{}'
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      return NextResponse.json(fallbackAnalysis(parsed.data.message_text))
    }
    const json = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
    const validated = analysisSchema.safeParse(json)
    if (!validated.success) return NextResponse.json(fallbackAnalysis(parsed.data.message_text))
    return NextResponse.json(validated.data)
  } catch {
    return NextResponse.json(fallbackAnalysis(parsed.data.message_text))
  }
}
