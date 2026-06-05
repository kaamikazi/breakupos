import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/shared/InlineAlert'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isBetaAccessEnabled } from '@/lib/beta'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const betaEnabled = isBetaAccessEnabled()

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-4 py-1.5 text-sm text-pink-200 mb-8">
          <span>{betaEnabled ? 'Private beta now open by invite' : 'Private relationship clarity'}</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight mb-6">
          Stop guessing what happened.<br />
          <span className="text-pink-500">Track the pattern.</span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto mb-8 leading-relaxed">
          BreakupOS is a private relationship CRM for situations, red flags, no-contact recovery, and AI-assisted reflection. It helps you see the data without pretending to be therapy.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth">
            <Button size="lg" className="bg-pink-500 hover:bg-pink-600 text-white text-base px-8 h-12">
              {betaEnabled ? 'Enter Private Beta' : 'Start Tracking Free'}
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-base px-8 h-12">
              See Pro Features
            </Button>
          </Link>
        </div>
        <div className="mt-8 max-w-2xl mx-auto">
          <InlineAlert tone="warning">
            BreakupOS is not therapy, legal advice, or crisis support. If you are dealing with abuse, stalking, harassment, threats, or self-harm risk, prioritize trusted people and emergency resources.
          </InlineAlert>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '📊',
              title: 'Track situations',
              description: 'Organize talking stages, dates, ghosts, no-contact cases, and red-flag holds without keeping it all in your head.',
            },
            {
              icon: '🛡️',
              title: 'Protect your recovery',
              description: 'No-contact streaks, relapse logs, reasons lists, and emergency copy help you pause before an impulsive message.',
            },
            {
              icon: '🔒',
              title: 'Privacy first',
              description: 'Export or delete your data, hide names on shared screens, and preview screenshots locally without storing them.',
            },
          ].map(feature => (
            <div
              key={feature.title}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {[
              { stage: '👀 Orbiting', cards: ['🧑 Alex', '👩 Jordan'] },
              { stage: '💬 Talking Stage', cards: ['👨 Sam'] },
              { stage: '🔥 Situationship', cards: ['🧕 Casey', '👱 Riley'] },
              { stage: '🛡️ No Contact', cards: ['💀 The Ex'] },
              { stage: '👻 Ghosted Me', cards: ['🤡 Drew'] },
            ].map(col => (
              <div key={col.stage} className="w-48 shrink-0">
                <div className="text-xs font-medium text-zinc-400 mb-3">{col.stage}</div>
                <div className="space-y-2">
                  {col.cards.map(name => (
                    <div key={name} className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                      <div className="text-sm text-white">{name}</div>
                      <div className="flex gap-0.5 mt-1">
                        {'♥♥♥♡♡'.split('').map((h, i) => (
                          <span key={i} className={i < 3 ? 'text-pink-500 text-xs' : 'text-zinc-700 text-xs'}>{h}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Free during beta</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Start with the pipeline, flags, notes, and recovery basics. The beta is intentionally small so feedback can shape the product safely.
            </p>
          </div>
          <div className="bg-zinc-900 border border-pink-500/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Pro value we are testing</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Advanced analytics, message analysis, weekly coach summaries, and printable relationship reports are the premium workflows being validated.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready for a calmer read on the pattern?</h2>
        <p className="text-zinc-400 mb-8">Bring your beta code. Leave the chaos outside the spreadsheet.</p>
        <Link href="/auth">
          <Button size="lg" className="bg-pink-500 hover:bg-pink-600 text-white text-base px-10 h-12">
            {betaEnabled ? 'Enter Private Beta' : 'Get Started'}
          </Button>
        </Link>
      </section>
    </div>
  )
}
