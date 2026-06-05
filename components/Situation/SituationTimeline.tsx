'use client'

import { format, parseISO } from 'date-fns'
import type { AIAdvice, Interaction, Situation } from '@/types'

interface TimelineEvent {
  id: string
  date: string
  icon: string
  title: string
  body: string
  tone: string
}

interface SituationTimelineProps {
  situation: Situation
  interactions: Interaction[]
  advice: AIAdvice[]
}

export function SituationTimeline({ situation, interactions, advice }: SituationTimelineProps) {
  const events: TimelineEvent[] = [
    situation.first_contact ? {
      id: 'first-contact',
      date: situation.first_contact,
      icon: '✨',
      title: 'First contact',
      body: `Met through ${situation.contact_method}.`,
      tone: 'border-blue-500/30 text-blue-300',
    } : null,
    situation.no_contact_started ? {
      id: 'no-contact-started',
      date: situation.no_contact_started,
      icon: '🛡️',
      title: 'No-contact started',
      body: 'Recovery mode began.',
      tone: 'border-emerald-500/30 text-emerald-300',
    } : null,
    ...interactions.map(item => ({
      id: item.id,
      date: item.date,
      icon:
        item.type === 'date' ? '📅' :
        item.type === 'ghost' ? '👻' :
        item.type === 'relapse' ? '↩' :
        item.type === 'stage_change' ? '➡' :
        item.type === 'conflict' ? '⚠️' :
        item.type === 'repair' ? '🧩' :
        '💬',
      title: item.type.replace(/_/g, ' '),
      body: item.note || `${item.sentiment} interaction logged.`,
      tone:
        item.sentiment === 'positive' ? 'border-emerald-500/30 text-emerald-300' :
        item.sentiment === 'negative' ? 'border-red-500/30 text-red-300' :
        'border-zinc-700 text-zinc-300',
    })),
    ...situation.red_flags.map((flag, index) => ({
      id: `red-${index}`,
      date: situation.updated_at,
      icon: '🚩',
      title: 'Red flag',
      body: flag,
      tone: 'border-red-500/30 text-red-300',
    })),
    ...advice.map(item => ({
      id: item.id,
      date: item.created_at,
      icon: '🤖',
      title: `AI advice: ${item.advice_type.replace(/_/g, ' ')}`,
      body: item.question,
      tone: 'border-pink-500/30 text-pink-300',
    })),
  ].filter(Boolean) as TimelineEvent[]

  const sorted = events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-zinc-500 text-center py-8">
        No timeline events yet. Log a date, message, flag, or advisor note and the story will assemble here.
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-800" />
      <div className="space-y-3">
        {sorted.map(event => (
          <div key={event.id} className="flex gap-3 pl-10 relative">
            <div className={`absolute left-0 w-8 h-8 rounded-full bg-zinc-950 border flex items-center justify-center text-base ${event.tone}`}>
              {event.icon}
            </div>
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium capitalize text-white">{event.title}</span>
                <span className="text-xs text-zinc-500">
                  {format(parseISO(event.date.slice(0, 10)), 'MMM d, yyyy')}
                </span>
              </div>
              <p className="text-sm text-zinc-300">{event.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
