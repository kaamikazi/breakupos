import { describe, expect, it } from 'vitest'
import { analysisSchema, analyzerInputSchema, fallbackAnalysis } from '@/lib/message-analysis'

describe('message analyzer helpers', () => {
  it('validates analyzer input', () => {
    expect(analyzerInputSchema.safeParse({ message_text: 'too short' }).success).toBe(false)
    expect(analyzerInputSchema.safeParse({ message_text: 'This is a long enough message thread.' }).success).toBe(true)
  })

  it('detects fallback red flags and keeps score bounded', () => {
    const analysis = fallbackAnalysis('You are crazy and overreacting. I am busy maybe later?')

    expect(analysis.interestLevel).toBeGreaterThanOrEqual(0)
    expect(analysis.interestLevel).toBeLessThanOrEqual(100)
    expect(analysis.redFlags).toContain('Invalidating language')
    expect(analysisSchema.safeParse(analysis).success).toBe(true)
  })
})
