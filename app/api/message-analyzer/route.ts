import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { anthropic, extractText, SAFETY_DISCLAIMER } from '@/lib/anthropic'
import { getClientIp, jsonError, parseJson, productionAiRateLimitGuard, rateLimit } from '@/lib/api'
import { analysisSchema, analyzerInputSchema, fallbackAnalysis } from '@/lib/message-analysis'
import { canAffordCredits, getCreditBalance, getCreditCost, recordAIUsageEvent, refundCredits, spendCredits } from '@/lib/credits'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const productionGuard = productionAiRateLimitGuard('message-analyzer', user.id)
  if (productionGuard) return productionGuard

  const limit = await rateLimit(`analyzer:${user.id}:${getClientIp(req)}`, 20, 60 * 60 * 1000)
  if (limit.limited) return jsonError('Message analyzer rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, analyzerInputSchema)
  if (parsed.error) return parsed.error

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const shouldChargeCredits = profile?.plan !== 'pro' && Boolean(process.env.ANTHROPIC_API_KEY)
  if (shouldChargeCredits) {
    const balance = await getCreditBalance(user.id)
    if (!canAffordCredits(balance, 'message_analysis')) {
      await recordAIUsageEvent({ userId: user.id, action: 'message_analysis', status: 'blocked' })
      return jsonError(`Message analysis costs ${getCreditCost('message_analysis')} credits.`, 402)
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(fallbackAnalysis(parsed.data.message_text))
  }

  let reservedCredits = 0
  let providerResponded = false
  if (shouldChargeCredits) {
    const charge = await spendCredits({ userId: user.id, action: 'message_analysis' })
    if (!charge.ok) {
      await recordAIUsageEvent({ userId: user.id, action: 'message_analysis', status: 'blocked' })
      return jsonError(`Message analysis costs ${getCreditCost('message_analysis')} credits.`, 402)
    }
    reservedCredits = charge.amount
  }

  try {
    await recordAIUsageEvent({ userId: user.id, action: 'message_analysis', status: 'started' })
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
    providerResponded = true
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      await recordAIUsageEvent({
        userId: user.id,
        action: 'message_analysis',
        status: 'succeeded',
        creditsCharged: shouldChargeCredits ? reservedCredits : 0,
      })
      return NextResponse.json(fallbackAnalysis(parsed.data.message_text))
    }
    let json: unknown
    try {
      json = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
    } catch {
      await recordAIUsageEvent({
        userId: user.id,
        action: 'message_analysis',
        status: 'succeeded',
        creditsCharged: shouldChargeCredits ? reservedCredits : 0,
      })
      return NextResponse.json(fallbackAnalysis(parsed.data.message_text))
    }
    const validated = analysisSchema.safeParse(json)
    if (!validated.success) {
      await recordAIUsageEvent({
        userId: user.id,
        action: 'message_analysis',
        status: 'succeeded',
        creditsCharged: shouldChargeCredits ? reservedCredits : 0,
      })
      return NextResponse.json(fallbackAnalysis(parsed.data.message_text))
    }
    if (shouldChargeCredits) {
      await recordAIUsageEvent({ userId: user.id, action: 'message_analysis', status: 'succeeded', creditsCharged: reservedCredits })
    } else {
      await recordAIUsageEvent({ userId: user.id, action: 'message_analysis', status: 'succeeded' })
    }
    return NextResponse.json(validated.data)
  } catch {
    if (shouldChargeCredits && reservedCredits > 0 && !providerResponded) {
      await refundCredits({ userId: user.id, action: 'message_analysis', amount: reservedCredits })
    }
    await recordAIUsageEvent({ userId: user.id, action: 'message_analysis', status: 'failed' })
    return NextResponse.json(fallbackAnalysis(parsed.data.message_text))
  }
}
