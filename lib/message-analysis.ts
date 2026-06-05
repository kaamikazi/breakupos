import { z } from 'zod'

export const analyzerInputSchema = z.object({
  message_text: z.string().trim().min(10).max(8000),
  context: z.string().trim().max(1000).optional().default(''),
})

export const analysisSchema = z.object({
  interestLevel: z.number().min(0).max(100),
  mixedSignals: z.array(z.string()).default([]),
  avoidantBehavior: z.array(z.string()).default([]),
  redFlags: z.array(z.string()).default([]),
  recommendedReply: z.string().min(1),
  confidence: z.number().min(0).max(100),
  explanation: z.string().min(1),
})

export function fallbackAnalysis(text: string) {
  const lower = text.toLowerCase()
  const redFlags = [
    lower.includes('crazy') || lower.includes('overreact') ? 'Invalidating language' : '',
    lower.includes('secret') ? 'Secrecy pressure' : '',
    lower.includes('sorry') && lower.includes('but') ? 'Conditional apology' : '',
  ].filter(Boolean)
  const avoidant = [
    lower.includes('busy') ? 'Uses busyness as distance' : '',
    lower.includes('later') || lower.includes('maybe') ? 'Keeps plans vague' : '',
  ].filter(Boolean)
  const mixed = [
    lower.includes('miss you') && lower.includes('not ready') ? 'Affection paired with non-commitment' : '',
    lower.includes('?') && lower.includes('lol') ? 'Playful engagement, but unclear intent' : '',
  ].filter(Boolean)

  const interestLevel = Math.max(
    20,
    Math.min(80, 55 + (text.match(/\?/g)?.length ?? 0) * 4 - avoidant.length * 12 - redFlags.length * 15)
  )

  return {
    interestLevel,
    mixedSignals: mixed.length ? mixed : ['No obvious mixed signal detected from simple keyword analysis.'],
    avoidantBehavior: avoidant.length ? avoidant : ['No strong avoidant pattern detected.'],
    redFlags: redFlags.length ? redFlags : ['No severe red flag detected in the pasted text.'],
    recommendedReply: 'Keep it calm and direct: "I hear you. What are you actually looking for from this conversation?"',
    confidence: 45,
    explanation: 'Fallback analysis used because the AI service was unavailable. Add an Anthropic API key for richer results.',
  }
}
