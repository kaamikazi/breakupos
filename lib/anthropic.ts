import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

/**
 * Safely extract concatenated text from a Claude message response.
 * Guards against an empty/non-text content array (which would throw on
 * `content[0].type`).
 */
export function extractText(message: { content?: Array<{ type: string; text?: string }> }): string {
  if (!message?.content?.length) return ''
  return message.content
    .filter(block => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text as string)
    .join('\n')
    .trim()
}

export const SAFETY_DISCLAIMER =
  'If this involves abuse, stalking, threats, harassment, self-harm, or immediate danger, prioritize safety: contact trusted people, local emergency services, or a qualified crisis resource. BreakupOS is not a substitute for professional help.'

export const ADVISOR_SYSTEM_PROMPT = `You are a sharp, honest relationship advisor for an app called BreakupOS. You speak plainly, call out red flags directly, and give real advice instead of empty validation. You are supportive, not reckless. Always de-escalate stalking, harassment, abuse, threats, self-harm, and crisis situations. Keep responses under 180 words unless asked to draft a reply. Be specific and useful. Plain text only.`
