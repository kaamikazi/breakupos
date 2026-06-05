'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdviceCard } from './AdviceCard'
import { PlanGate } from '@/components/shared/PlanGate'
import { InlineAlert } from '@/components/shared/InlineAlert'
import { toast } from 'sonner'
import type { AIAdvice, AdviceType, AdvisorMode, AdvisorTone } from '@/types'

const QUICK_PROMPTS: { label: string; question: string; type: AdviceType; mode: AdvisorMode }[] = [
  { label: 'Analyze red flags', question: 'Analyze my red flags. Am I ignoring something?', type: 'red_flag_analysis', mode: 'advice' },
  { label: 'Should I text first?', question: 'Should I make a move? What should I do next?', type: 'move_recommendation', mode: 'advice' },
  { label: 'Draft my reply', question: 'Draft a reply that is calm, clear, and not needy.', type: 'draft_reply', mode: 'draft_reply' },
  { label: 'Analyze this message', question: 'Analyze the pasted message and tell me what signals matter.', type: 'message_analysis', mode: 'analyze_message' },
  { label: 'Exit strategy', question: 'How do I exit this cleanly without drama?', type: 'exit_strategy', mode: 'advice' },
]

interface AdvisorChatProps {
  situationId: string
  isPro: boolean
  initialAdvice: AIAdvice[]
}

export function AdvisorChat({ situationId, isPro, initialAdvice }: AdvisorChatProps) {
  const [question, setQuestion] = useState('')
  const [messageText, setMessageText] = useState('')
  const [adviceType, setAdviceType] = useState<AdviceType>('general')
  const [tone, setTone] = useState<AdvisorTone>('gentle')
  const [mode, setMode] = useState<AdvisorMode>('advice')
  const [advice, setAdvice] = useState<AIAdvice[]>(initialAdvice)
  const [loading, setLoading] = useState(false)

  const askAdvisor = async (q: string, type: AdviceType, selectedMode = mode) => {
    if (!q.trim()) return
    if (selectedMode === 'analyze_message' && !messageText.trim()) {
      toast.error('Paste the message text first.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situation_id: situationId,
          question: q,
          advice_type: type,
          tone,
          mode: selectedMode,
          message_text: messageText,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to get advice')
        return
      }
      setAdvice(prev => [data, ...prev])
      setQuestion('')
    } catch {
      toast.error('Advisor unavailable right now')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PlanGate isPro={isPro} feature="AI Advisor">
      <div className="space-y-4">
        <InlineAlert tone="warning" className="p-3 text-xs">
          Safety note: if this involves abuse, stalking, harassment, threats, self-harm, or immediate danger, prioritize real-world support and emergency resources.
        </InlineAlert>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Tone</label>
            <Select value={tone} onValueChange={v => setTone(v as AdvisorTone)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="gentle" className="text-white">Gentle</SelectItem>
                <SelectItem value="brutal" className="text-white">Brutal</SelectItem>
                <SelectItem value="therapist" className="text-white">Therapist-ish</SelectItem>
                <SelectItem value="best_friend" className="text-white">Best friend</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Mode</label>
            <Select
              value={mode}
              onValueChange={v => {
                const nextMode = v as AdvisorMode
                setMode(nextMode)
                setAdviceType(nextMode === 'draft_reply' ? 'draft_reply' : nextMode === 'analyze_message' ? 'message_analysis' : 'general')
              }}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="advice" className="text-white">Advice</SelectItem>
                <SelectItem value="draft_reply" className="text-white">Draft my reply</SelectItem>
                <SelectItem value="analyze_message" className="text-white">Analyze this message</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(p => (
            <Button
              key={`${p.type}-${p.mode}`}
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
              onClick={() => {
                setMode(p.mode)
                setAdviceType(p.type)
                askAdvisor(p.question, p.type, p.mode)
              }}
              disabled={loading}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {(mode === 'draft_reply' || mode === 'analyze_message') && (
          <Textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            placeholder="Paste the message or conversation text here..."
            className="bg-zinc-900 border-zinc-700 text-white text-sm resize-none"
            rows={5}
          />
        )}

        <div className="space-y-2">
          <Textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder={mode === 'draft_reply' ? 'What do you want this reply to accomplish?' : 'Ask about this specific situation...'}
            className="bg-zinc-900 border-zinc-700 text-white text-sm resize-none"
            rows={3}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.metaKey) askAdvisor(question, adviceType)
            }}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => askAdvisor(question, adviceType)}
              disabled={loading || !question.trim()}
              className="bg-pink-500 hover:bg-pink-600 text-white"
              size="sm"
            >
              {loading ? 'Thinking...' : 'Ask Advisor'}
            </Button>
          </div>
        </div>

        {advice.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Advice History</h4>
            {advice.map(a => <AdviceCard key={a.id} advice={a} />)}
          </div>
        )}
      </div>
    </PlanGate>
  )
}
