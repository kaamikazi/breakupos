'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface GenerateReportButtonProps {
  situationId: string
  isPro: boolean
}

export function GenerateReportButton({ situationId, isPro }: GenerateReportButtonProps) {
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!isPro) {
      toast.error('Relationship Reports are a Pro feature.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation_id: situationId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not generate report')
        return
      }
      toast.success('Report generated')
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Report generator unavailable right now')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={generate}
      disabled={loading}
      variant="outline"
      className="border-pink-500/40 text-pink-300 hover:bg-pink-500/10"
    >
      {loading ? 'Generating...' : 'Generate Report'}
    </Button>
  )
}
