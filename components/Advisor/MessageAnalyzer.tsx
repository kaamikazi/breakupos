'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { PlanGate } from '@/components/shared/PlanGate'
import { InlineAlert } from '@/components/shared/InlineAlert'
import type { MessageAnalysis } from '@/types'
import { toast } from 'sonner'

interface MessageAnalyzerProps {
  isPro: boolean
}

export function MessageAnalyzer({ isPro }: MessageAnalyzerProps) {
  const [messageText, setMessageText] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<MessageAnalysis | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [screenshotName, setScreenshotName] = useState('')

  useEffect(() => {
    return () => {
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview)
    }
  }, [screenshotPreview])

  const handleScreenshot = (file: File | undefined) => {
    if (!file) return
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Upload a PNG, JPG, or WebP screenshot.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Screenshot must be 5MB or smaller.')
      return
    }
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview)
    setScreenshotPreview(URL.createObjectURL(file))
    setScreenshotName(file.name)
    toast.info('Screenshot preview loaded. OCR is not connected yet; paste extracted text below.')
  }

  const clearScreenshot = () => {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview)
    setScreenshotPreview(null)
    setScreenshotName('')
  }

  const analyze = async () => {
    if (messageText.trim().length < 10) {
      toast.error('Paste at least a few lines of the message thread.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/message-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_text: messageText, context }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not analyze message')
        return
      }
      setAnalysis(data)
    } catch {
      toast.error('Analyzer unavailable right now')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PlanGate isPro={isPro} feature="Message Analyzer">
      <div className="space-y-5">
        <InlineAlert tone="warning">
          Screenshots stay in your browser preview and are not uploaded or stored by BreakupOS. OCR is a planned integration; paste extracted text into the analyzer for now. If a message involves abuse, stalking, harassment, threats, self-harm, or immediate danger, prioritize real-world safety.
        </InlineAlert>

        <div className="space-y-3">
          <Input
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Optional context: ex, talking stage, post-fight, etc."
            className="bg-zinc-900 border-zinc-700 text-white"
          />
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Screenshot analysis</h3>
                <p className="text-xs text-zinc-500">WhatsApp, Messenger, Instagram DMs, or generic chat screenshots.</p>
              </div>
              {screenshotPreview && (
                <Button size="sm" variant="ghost" className="text-zinc-400" onClick={clearScreenshot}>
                  Remove
                </Button>
              )}
            </div>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={e => handleScreenshot(e.target.files?.[0])}
              className="bg-zinc-950 border-zinc-700 text-white"
            />
            {screenshotPreview && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
                <Image
                  src={screenshotPreview}
                  alt={`Preview of ${screenshotName}`}
                  width={320}
                  height={220}
                  unoptimized
                  className="max-h-56 w-full rounded-md border border-zinc-800 object-contain"
                />
                <InlineAlert tone="info">
                  OCR provider integration TODO: send this image to a privacy-reviewed OCR provider, discard the image immediately, then populate the textarea. Until then, paste the extracted text manually below.
                </InlineAlert>
              </div>
            )}
          </div>
          <Textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            placeholder="Paste the conversation or extracted screenshot text here..."
            className="bg-zinc-900 border-zinc-700 text-white min-h-[220px]"
          />
          <div className="flex justify-end">
            <Button onClick={analyze} disabled={loading} className="bg-pink-500 hover:bg-pink-600 text-white">
              {loading ? 'Analyzing...' : 'Analyze Message'}
            </Button>
          </div>
        </div>

        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 lg:col-span-1">
              <div className="text-xs text-zinc-500 mb-2">Interest Level</div>
              <div className="text-3xl font-bold text-white mb-3">{analysis.interestLevel}%</div>
              <Progress value={analysis.interestLevel} className="h-2" />
              <div className="text-xs text-zinc-500 mt-4">Confidence</div>
              <div className="text-lg font-semibold text-zinc-200">{analysis.confidence}%</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 lg:col-span-2 space-y-4">
              {[
                ['Mixed signals', analysis.mixedSignals],
                ['Avoidant behavior', analysis.avoidantBehavior],
                ['Red flags', analysis.redFlags],
              ].map(([title, items]) => (
                <div key={title as string}>
                  <h3 className="text-sm font-semibold text-white mb-2">{title as string}</h3>
                  <ul className="space-y-1">
                    {(items as string[]).map(item => (
                      <li key={item} className="text-sm text-zinc-300">- {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Recommended next reply</h3>
                <p className="text-sm text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-md p-3">
                  {analysis.recommendedReply}
                </p>
              </div>
              <p className="text-sm text-zinc-400">{analysis.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </PlanGate>
  )
}
