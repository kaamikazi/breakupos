'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SituationForm } from '@/components/Situation/SituationForm'
import { InlineAlert } from '@/components/shared/InlineAlert'

export function OnboardingGuide() {
  const [open, setOpen] = useState(false)

  return (
    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs text-pink-200">
            First run
          </div>
          <h2 className="text-xl font-semibold text-white">Create your first situation</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            A situation is any connection you want to understand: a talking stage, date, ex, ghost, or no-contact recovery case. Start lightweight; you can add flags, notes, and interactions later.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-pink-500 text-white hover:bg-pink-600">
          Create first situation
        </Button>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <InlineAlert tone="info" title="Interaction examples">
          Message, date, call, ghost, left on read, conflict, repair, boundary, or relapse.
        </InlineAlert>
        <InlineAlert tone="success" title="Privacy expectation">
          Use nicknames if you want. You can export or delete relationship data from Privacy.
        </InlineAlert>
        <InlineAlert tone="warning" title="Safety note">
          BreakupOS is not therapy or crisis support. Use trusted help for danger, abuse, or self-harm risk.
        </InlineAlert>
      </div>
      <SituationForm open={open} onClose={() => setOpen(false)} />
    </section>
  )
}
