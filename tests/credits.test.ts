import { describe, expect, it } from 'vitest'
import { aiActionForAdvisor, canAffordCredits, getCreditCost } from '@/lib/credits'

describe('credit costs', () => {
  it('assigns stable costs to expensive AI actions', () => {
    expect(getCreditCost('basic_ai_advice')).toBe(1)
    expect(getCreditCost('message_analysis')).toBe(3)
    expect(getCreditCost('screenshot_chat_analysis')).toBe(5)
    expect(getCreditCost('relationship_report')).toBe(10)
    expect(getCreditCost('recovery_plan_30_day')).toBe(20)
  })

  it('blocks actions when the wallet cannot cover the cost', () => {
    expect(canAffordCredits(3, 'message_analysis')).toBe(true)
    expect(canAffordCredits(2, 'message_analysis')).toBe(false)
    expect(canAffordCredits(null, 'basic_ai_advice')).toBe(false)
  })

  it('maps advisor modes to credit actions', () => {
    expect(aiActionForAdvisor({ mode: 'advice', advice_type: 'general' })).toBe('basic_ai_advice')
    expect(aiActionForAdvisor({ mode: 'draft_reply', advice_type: 'general' })).toBe('should_i_reply')
    expect(aiActionForAdvisor({ mode: 'analyze_message', advice_type: 'message_analysis' })).toBe('message_analysis')
    expect(aiActionForAdvisor({ mode: 'advice', advice_type: 'red_flag_analysis' })).toBe('red_flag_report')
  })
})
