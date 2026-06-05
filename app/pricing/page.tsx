'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const FREE_FEATURES = [
  '5 situations',
  '3 AI advice uses/month',
  'Pipeline board',
  'Flag tracking',
  'Interaction logging',
  '20 dating likes/day',
  'Basic discovery',
]

const PRO_FEATURES = [
  'Unlimited situations',
  'Unlimited AI advisor',
  'Advanced analytics dashboard',
  'Message analyzer',
  'Screenshot analysis flow',
  'Printable relationship reports',
  'Weekly AI coach summary',
  'Private vault',
  'Export data as JSON',
  'More dating likes',
  'Advanced dating filters',
  'Dating AI reply helper',
  'Dating chat analyzer',
  'AI icebreaker generator',
  'Who liked you preview',
  'Profile boost placeholder',
]

export default function PricingPage() {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error(data.error ?? 'Failed to start checkout')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-bold text-white">Simple pricing.</h1>
        <p className="text-zinc-400">Breakup intelligence, dating safety, and AI support in one Pro plan.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900 p-8">
          <div className="mb-6">
            <h2 className="mb-1 text-xl font-bold text-white">Free</h2>
            <div className="text-4xl font-bold text-white">$0</div>
            <div className="text-sm text-zinc-500">forever</div>
          </div>
          <ul className="mb-8 space-y-3">
            {FREE_FEATURES.map(feature => (
              <li key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="text-emerald-400">✓</span> {feature}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full border-zinc-700 text-zinc-300" disabled>
            Current Plan
          </Button>
        </Card>

        <Card className="relative overflow-hidden border-pink-500/50 bg-zinc-900 p-8">
          <div className="absolute right-4 top-4">
            <Badge className="bg-pink-500 text-xs text-white">Most Popular</Badge>
          </div>
          <div className="mb-6">
            <h2 className="mb-1 text-xl font-bold text-white">Pro</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">$7</span>
              <span className="text-sm text-zinc-500">/month</span>
            </div>
            <div className="text-sm text-zinc-500">Dating tools plus the full Breakup OS intelligence layer</div>
          </div>
          <ul className="mb-8 space-y-3">
            {PRO_FEATURES.map(feature => (
              <li key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                <span className="text-pink-400">✓</span> {feature}
              </li>
            ))}
          </ul>
          <Button onClick={handleUpgrade} disabled={loading} className="w-full bg-pink-500 text-white hover:bg-pink-600">
            {loading ? 'Loading...' : 'Upgrade to Pro'}
          </Button>
        </Card>
      </div>

      <p className="mt-8 text-center text-xs text-zinc-600">
        Stripe controls payment state. No premium feature is unlocked unless your account is actually Pro.
      </p>
    </div>
  )
}
