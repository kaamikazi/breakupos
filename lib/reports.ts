import { calculateCompatibilityBreakdown } from '@/lib/compatibility'
import type { Interaction, Situation } from '@/types'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function list(items: string[]) {
  if (!items.length) return '<p class="muted">None logged.</p>'
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

export function buildRelationshipReportHtml(
  situation: Situation,
  interactions: Interaction[],
  aiSummary: string,
  nextSteps: string[]
) {
  const breakdown = calculateCompatibilityBreakdown(situation, interactions)
  const ghostSignals = interactions.filter(i => i.type === 'ghost' || i.type === 'left_on_read').length
  const positive = interactions.filter(i => i.sentiment === 'positive').length
  const negative = interactions.filter(i => i.sentiment === 'negative').length
  const noContact = situation.is_breakup_mode || situation.stage === 'no_contact'

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(situation.name)} - BreakupOS Relationship Report</title>
  <style>
    body { background: #fafafa; color: #18181b; font-family: Arial, sans-serif; line-height: 1.5; margin: 0; padding: 32px; }
    main { max-width: 860px; margin: 0 auto; background: white; border: 1px solid #e4e4e7; border-radius: 12px; padding: 36px; }
    h1 { font-size: 30px; margin: 0 0 6px; }
    h2 { border-top: 1px solid #e4e4e7; margin-top: 28px; padding-top: 22px; font-size: 18px; }
    .muted { color: #71717a; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .stat { border: 1px solid #e4e4e7; border-radius: 10px; padding: 12px; }
    .stat strong { display: block; font-size: 22px; }
    li { margin-bottom: 6px; }
    @media print { body { background: white; padding: 0; } main { border: 0; border-radius: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <main>
    <button class="no-print" onclick="window.print()">Print / Save as PDF</button>
    <h1>BreakupOS Relationship Report</h1>
    <p class="muted">Generated ${escapeHtml(new Date().toLocaleDateString())} for ${escapeHtml(situation.name)}</p>

    <div class="grid">
      <div class="stat"><span>Compatibility</span><strong>${breakdown.score}/100</strong></div>
      <div class="stat"><span>Investment</span><strong>${situation.emotional_invest}/10</strong></div>
      <div class="stat"><span>Stage</span><strong>${escapeHtml(situation.stage.replaceAll('_', ' '))}</strong></div>
      <div class="stat"><span>Interactions</span><strong>${interactions.length}</strong></div>
    </div>

    <h2>Situation Overview</h2>
    <p>${escapeHtml(situation.notes || 'No private notes included.')}</p>

    <h2>Compatibility Score Breakdown</h2>
    ${list(breakdown.notes)}
    <p class="muted">Green flags ${breakdown.greenFlags}, red flags ${breakdown.redFlags}, consistency ${breakdown.responseConsistency}, ghosting ${breakdown.ghostingDuration}, conflict recovery ${breakdown.conflictRecovery}.</p>

    <h2>Emotional Investment Analysis</h2>
    <p>Your investment is ${situation.emotional_invest}/10. Recent sentiment includes ${positive} positive and ${negative} negative logged interactions.</p>

    <h2>Flags</h2>
    <strong>Red flags</strong>
    ${list(situation.red_flags ?? [])}
    <strong>Green flags</strong>
    ${list(situation.green_flags ?? [])}

    <h2>Ghosting and Consistency</h2>
    <p>${ghostSignals} ghosting or left-on-read signal(s) logged. ${breakdown.responseConsistency >= 0 ? 'Interaction rhythm is not currently a major penalty.' : 'Long gaps are pulling the score down.'}</p>

    <h2>No-Contact / Recovery Status</h2>
    <p>${noContact ? `Recovery mode is active${situation.no_contact_started ? ` since ${escapeHtml(situation.no_contact_started)}` : ''}.` : 'No-contact mode is not active for this situation.'}</p>

    <h2>AI Summary</h2>
    <p>${escapeHtml(aiSummary)}</p>

    <h2>Recommended Next Steps</h2>
    ${list(nextSteps)}
  </main>
</body>
</html>`
}
