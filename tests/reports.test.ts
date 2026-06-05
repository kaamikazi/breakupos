import { describe, expect, it } from 'vitest'
import { fallbackReportSummary, reportAiSchema, reportRequestSchema } from '@/lib/report-summary'
import { buildRelationshipReportHtml } from '@/lib/reports'
import { baseInteractions, baseSituation } from './fixtures'

describe('relationship reports', () => {
  it('validates report generation input', () => {
    expect(reportRequestSchema.safeParse({ situation_id: baseSituation.id }).success).toBe(true)
    expect(reportRequestSchema.safeParse({ situation_id: 'not-a-uuid' }).success).toBe(false)
  })

  it('generates fallback summary and valid AI shape', () => {
    const summary = fallbackReportSummary(baseSituation, baseInteractions)

    expect(summary.recommended_next_steps.length).toBeGreaterThan(0)
    expect(reportAiSchema.safeParse(summary).success).toBe(true)
  })

  it('escapes private report HTML content', () => {
    const html = buildRelationshipReportHtml(
      { ...baseSituation, notes: '<script>alert("x")</script>' },
      baseInteractions,
      'Summary',
      ['Next step']
    )

    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>alert')
  })
})
