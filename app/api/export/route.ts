import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { jsonError } from '@/lib/api'
import type { AIAdvice, AppNotification, DatingMatch, DatingMessage, DatingProfileWithPhotos, Interaction, ProfileLike, ProfilePass, RelationshipReport, Situation, UserBlock, UserReport, WeeklySummary } from '@/types'
import { maskDeletedMessageBody } from '@/lib/dating-chat'

function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replaceAll('"', '""')}"`
  }
  return str
}

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
  ]
  return lines.join('\r\n')
}

function situationsToCsv(situations: Situation[]): string {
  const headers = ['id', 'name', 'stage', 'vibe', 'compatibility', 'emotional_invest',
    'red_flags', 'green_flags', 'contact_method', 'first_contact', 'last_interaction',
    'is_breakup_mode', 'no_contact_started', 'created_at']
  const rows = situations.map(s => [
    s.id, s.name, s.stage, s.vibe, s.compatibility, s.emotional_invest,
    (s.red_flags ?? []).join('; '), (s.green_flags ?? []).join('; '),
    s.contact_method, s.first_contact ?? '', s.last_interaction ?? '',
    s.is_breakup_mode ?? false, s.no_contact_started ?? '', s.created_at,
  ])
  return rowsToCsv(headers, rows)
}

function interactionsToCsv(interactions: Interaction[]): string {
  const headers = ['id', 'situation_id', 'type', 'sentiment', 'date', 'note', 'created_at']
  const rows = interactions.map(i => [
    i.id, i.situation_id, i.type, i.sentiment, i.date, i.note, i.created_at,
  ])
  return rowsToCsv(headers, rows)
}

function adviceToCsv(advice: AIAdvice[]): string {
  const headers = ['id', 'situation_id', 'advice_type', 'question', 'advice', 'created_at']
  const rows = advice.map(a => [
    a.id, a.situation_id, a.advice_type, a.question, a.advice, a.created_at,
  ])
  return rowsToCsv(headers, rows)
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (profile?.plan !== 'pro') return jsonError('Data export is a Pro feature.', 403)

  const format = new URL(req.url).searchParams.get('format') ?? 'json'

  const [{ data: situations }, { data: interactions }, { data: advice }, { data: relationshipReports }, { data: weeklySummaries }] = await Promise.all([
    supabase.from('situations').select('*').eq('user_id', user.id),
    supabase.from('interactions').select('*').eq('user_id', user.id),
    supabase.from('ai_advice').select('*').eq('user_id', user.id),
    supabase.from('relationship_reports').select('*').eq('user_id', user.id),
    supabase.from('weekly_summaries').select('*').eq('user_id', user.id),
  ])

  const [
    { data: datingProfile },
    { data: profilePhotos },
    { data: profileLikes },
    { data: profilePasses },
    { data: datingMatches },
    { data: userBlocks },
    { data: userReports },
    { data: notifications },
  ] = await Promise.all([
    supabase.from('dating_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('profile_photos').select('*').eq('user_id', user.id).order('position'),
    supabase.from('profile_likes').select('*').or(`liker_user_id.eq.${user.id},liked_user_id.eq.${user.id}`),
    supabase.from('profile_passes').select('*').or(`passer_user_id.eq.${user.id},passed_user_id.eq.${user.id}`),
    supabase.from('matches').select('*').or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`),
    supabase.from('user_blocks').select('*').or(`blocker_user_id.eq.${user.id},blocked_user_id.eq.${user.id}`),
    supabase.from('user_reports').select('*').or(`reporter_user_id.eq.${user.id},reported_user_id.eq.${user.id}`),
    supabase.from('notifications').select('*').eq('user_id', user.id),
  ])

  const sits = (situations ?? []) as Situation[]
  const ints = (interactions ?? []) as Interaction[]
  const advs = (advice ?? []) as AIAdvice[]
  const matchIds = ((datingMatches ?? []) as DatingMatch[]).map(match => match.id)
  const { data: datingMessages } = matchIds.length
    ? await supabase.from('dating_messages').select('*').in('match_id', matchIds).order('created_at', { ascending: true })
    : { data: [] }
  const safeDatingMessages = ((datingMessages ?? []) as DatingMessage[]).map(maskDeletedMessageBody)
  const dating = datingProfile
    ? ({ ...datingProfile, photos: profilePhotos ?? [] } as DatingProfileWithPhotos)
    : null

  if (format === 'csv') {
    const csvParts = [
      '# BreakupOS Export',
      `# Exported: ${new Date().toISOString()}`,
      '',
      '## Situations',
      situationsToCsv(sits),
      '',
      '## Interactions',
      interactionsToCsv(ints),
      '',
      '## AI Advice',
      adviceToCsv(advs),
      '',
      '## Relationship Reports',
      rowsToCsv(
        ['id', 'situation_id', 'title', 'summary', 'created_at'],
        ((relationshipReports ?? []) as RelationshipReport[]).map(report => [report.id, report.situation_id, report.title, report.summary, report.created_at])
      ),
      '',
      '## Weekly Summaries',
      rowsToCsv(
        ['id', 'week_start', 'week_end', 'summary', 'suggested_focus', 'created_at'],
        ((weeklySummaries ?? []) as WeeklySummary[]).map(summary => [summary.id, summary.week_start, summary.week_end, summary.summary, summary.suggested_focus, summary.created_at])
      ),
      '',
      '## Dating Profile',
      rowsToCsv(
        ['display_name', 'age', 'gender', 'interested_in', 'relationship_goal', 'city', 'visibility_status', 'interests'],
        dating ? [[dating.display_name, dating.age, dating.gender, dating.interested_in, dating.relationship_goal, dating.city, dating.visibility_status, dating.interests.join('; ')]] : []
      ),
      '',
      '## Matches',
      rowsToCsv(
        ['id', 'user_one_id', 'user_two_id', 'created_at'],
        ((datingMatches ?? []) as DatingMatch[]).map(match => [match.id, match.user_one_id, match.user_two_id, match.created_at])
      ),
      '',
      '## Dating Messages',
      rowsToCsv(
        ['id', 'match_id', 'body', 'created_at', 'deleted_at', 'read_at'],
        safeDatingMessages.map(message => [message.id, message.match_id, message.body, message.created_at, message.deleted_at ?? '', message.read_at ?? ''])
      ),
      '',
      '## Notifications',
      rowsToCsv(
        ['id', 'type', 'title', 'body', 'link_url', 'read_at', 'created_at'],
        ((notifications ?? []) as AppNotification[]).map(item => [item.id, item.type, item.title, item.body, item.link_url ?? '', item.read_at ?? '', item.created_at])
      ),
    ]
    return new NextResponse(csvParts.join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="breakupos-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  return NextResponse.json(
    {
      exported_at: new Date().toISOString(),
      situations: sits,
      interactions: ints,
      ai_advice: advs,
      relationship_reports: (relationshipReports ?? []) as RelationshipReport[],
      weekly_summaries: (weeklySummaries ?? []) as WeeklySummary[],
      dating_profile: dating,
      profile_likes: (profileLikes ?? []) as ProfileLike[],
      profile_passes: (profilePasses ?? []) as ProfilePass[],
      matches: (datingMatches ?? []) as DatingMatch[],
      dating_messages: safeDatingMessages,
      user_blocks: (userBlocks ?? []) as UserBlock[],
      user_reports: (userReports ?? []) as UserReport[],
      notifications: (notifications ?? []) as AppNotification[],
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
