'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PlanGateProps {
  children: React.ReactNode
  isPro: boolean
  feature?: string
}

export function PlanGate({ children, isPro, feature = 'This feature' }: PlanGateProps) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error(data.error ?? 'Failed to start checkout')
    } catch {
      toast.error('Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  if (isPro) return <>{children}</>

  return (
    <Card className="border-pink-500/30 bg-pink-500/5 p-6 text-center">
      <div className="mb-2 text-2xl">🔒</div>
      <h3 className="mb-1 font-semibold text-white">{feature} is Pro only</h3>
      <p className="mb-4 text-sm text-zinc-400">
        Upgrade to BreakupOS Pro for advanced analytics, message analyzer, weekly coach, dating AI tools, advanced filters, and more daily likes.
      </p>
      <Button onClick={handleUpgrade} disabled={loading} className="bg-pink-500 text-white hover:bg-pink-600">
        {loading ? 'Loading...' : 'Upgrade to Pro - $7/mo'}
      </Button>
    </Card>
  )
}
