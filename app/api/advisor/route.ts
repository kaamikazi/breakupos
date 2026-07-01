import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { checkAIQuota, ensureProfileForUser } from '@/lib/quota'
import { anthropic, extractText, ADVISOR_SYSTEM_PROMPT, SAFETY_DISCLAIMER } from '@/lib/anthropic'
import { ADVICE_TYPE_VALUES, FIELD_LIMITS } from '@/lib/domain'
import { getClientIp, jsonError, parseJson, productionAiRateLimitGuard, rateLimit } from '@/lib/api'
import { aiActionForAdvisor, canAffordCredits, getCreditBalance, getCreditCost, recordAIUsageEvent, refundCredits, spendCredits } from '@/lib/credits'
import { logServerError } from '@/lib/logging'

const advisorSchema = z.object({
  situation_id: z.string().uuid(),
  question: z.string().trim().min(1).max(FIELD_LIMITS.advisorQuestion),
  advice_type: z.enum(ADVICE_TYPE_VALUES).default('general'),
  tone: z.enum(['gentle', 'brutal', 'therapist', 'best_friend']).default('gentle'),
  mode: z.enum(['advice', 'draft_reply', 'analyze_message']).default('advice'),
  message_text: z.string().trim().max(6000).optional().default(''),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)

  const productionGuard = productionAiRateLimitGuard('advisor', user.id)
  if (productionGuard) return productionGuard

  await ensureProfileForUser(user)

  const limit = await rateLimit(`advisor:${user.id}:${getClientIp(req)}`, 30, 60 * 60 * 1000)
  if (limit.limited) return jsonError('AI advisor rate limit reached. Try again later.', 429)

  const parsed = await parseJson(req, advisorSchema)
  if (parsed.error) return parsed.error

  const creditAction = aiActionForAdvisor({
    mode: parsed.data.mode,
    advice_type: parsed.data.advice_type,
  })
  const canUseFreeQuotaOrPro = await checkAIQuota(user.id)
  let shouldChargeCredits = false

  if (!canUseFreeQuotaOrPro) {
    const balance = await getCreditBalance(user.id)
    if (!canAffordCredits(balance, creditAction)) {
      await recordAIUsageEvent({ userId: user.id, action: creditAction, status: 'blocked' })
      return NextResponse.json(
        { error: `AI limit reached. This action costs ${getCreditCost(creditAction)} credits.` },
        { status: 402 }
      )
    }
    shouldChargeCredits = true
  }

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
    .select('*')
    .eq('situation_id', parsed.data.situation_id)
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(10)

  const contextBlock = `
SITUATION CONTEXT:
Name: ${situation.name}
Stage: ${situation.stage}
Vibe: ${situation.vibe}
Emotional Investment (1-10): ${situation.emotional_invest}
Compatibility Score: ${situation.compatibility}/100
Red Flags: ${situation.red_flags?.length ? situation.red_flags.join(', ') : 'none'}
Green Flags: ${situation.green_flags?.length ? situation.green_flags.join(', ') : 'none'}
Memory summary: ${situation.memory_summary || 'none yet'}
Days known: ${situation.first_contact ? Math.floor((Date.now() - new Date(situation.first_contact).getTime()) / 86400000) : 'unknown'}
Contact method: ${situation.contact_method}
No-contact mode: ${situation.is_breakup_mode ? 'yes' : 'no'}

RECENT INTERACTIONS (last 10):
${interactions?.length
  ? interactions.map(i => `- ${i.date}: ${i.type} (${i.sentiment})${i.note ? ` - "${i.note}"` : ''}`).join('\n')
  : 'No interactions logged yet.'
}

MODE: ${parsed.data.mode}
TONE: ${parsed.data.tone}
PASTED MESSAGE OR THREAD:
${parsed.data.message_text || 'none'}

	USER QUESTION: ${parsed.data.question}
	`

  let reservedCredits = 0
  if (shouldChargeCredits) {
    const charge = await spendCredits({ userId: user.id, action: creditAction })
    if (!charge.ok) {
      await recordAIUsageEvent({ userId: user.id, action: creditAction, status: 'blocked' })
      return jsonError(`AI limit reached. This action costs ${getCreditCost(creditAction)} credits.`, 402)
    }
    reservedCredits = charge.amount
  }

  await recordAIUsageEvent({ userId: user.id, action: creditAction, status: 'started' })

  let message: Awaited<ReturnType<typeof anthropic.messages.create>>
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: parsed.data.mode === 'draft_reply' ? 450 : 320,
      system: `${ADVISOR_SYSTEM_PROMPT}

Tone guidance:
- gentle: warm, steady, low shame.
- brutal: blunt but not cruel.
- therapist: reflective, boundaried, safety-aware.
- best_friend: casual, protective, practical.

For draft_reply, write 2-3 reply options and explain which one is safest.
For analyze_message, summarize signals, risks, and the next move.
Include this safety note when relevant: ${SAFETY_DISCLAIMER}`,
      messages: [{ role: 'user', content: contextBlock }],
    })
  } catch (error) {
    if (shouldChargeCredits && reservedCredits > 0) {
      await refundCredits({ userId: user.id, action: creditAction, amount: reservedCredits })
    }
    await recordAIUsageEvent({ userId: user.id, action: creditAction, status: 'failed' })
    logServerError('AI advisor provider call failed', {
      route: 'advisor',
      operation: 'anthropic_call',
      code: 'provider_error',
      errorMessage: error instanceof Error ? error.message : 'Unknown provider error',
      userId: user.id,
    })
    return jsonError('The AI advisor is temporarily unavailable. Please try again.', 502)
  }

  const advice = extractText(message)
  if (!advice) {
    await recordAIUsageEvent({ userId: user.id, action: creditAction, status: 'failed' })
    return jsonError('The AI advisor did not return a response. Please try again.', 502)
  }
  const memorySummary = [
    situation.memory_summary,
    `${new Date().toISOString().split('T')[0]}: ${parsed.data.mode} / ${parsed.data.advice_type} - ${parsed.data.question.slice(0, 120)}`,
  ]
    .filter(Boolean)
    .join('\n')
    .slice(-1000)

  const { data: savedAdvice, error } = await serviceClient
    .from('ai_advice')
    .insert({
      situation_id: parsed.data.situation_id,
      user_id: user.id,
      question: parsed.data.question,
      advice,
      advice_type: parsed.data.advice_type,
    })
    .select()
    .single()

  if (error) {
    logServerError('AI advisor save failed', {
      route: 'advisor',
      operation: 'save_advice',
      code: error.code ?? 'unknown',
      errorMessage: error.message,
      userId: user.id,
    })
    return jsonError('Could not save AI advice right now.', 500)
  }

  if (shouldChargeCredits) {
    await recordAIUsageEvent({
      userId: user.id,
      action: creditAction,
      status: 'succeeded',
      creditsCharged: reservedCredits,
      referenceId: savedAdvice.id,
    })
  } else {
    await recordAIUsageEvent({ userId: user.id, action: creditAction, status: 'succeeded', referenceId: savedAdvice.id })
  }

  await serviceClient
    .from('situations')
    .update({ memory_summary: memorySummary })
    .eq('id', parsed.data.situation_id)
    .eq('user_id', user.id)

  return NextResponse.json(savedAdvice, { status: 201 })
}
