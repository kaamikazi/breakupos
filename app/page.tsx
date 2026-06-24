import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/shared/InlineAlert'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isBetaAccessEnabled } from '@/lib/beta'

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const betaEnabled = isBetaAccessEnabled()

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-4 py-1.5 text-sm text-pink-200">
          <span>{betaEnabled ? 'Private beta now open by invite' : 'Private relationship clarity'}</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-white sm:text-6xl">
          Your emotional operating system<br />
          <span className="text-pink-500">for modern dating chaos.</span>
        </h1>
        <p className="mx-auto mb-8 max-w-3xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
          Breakup OS helps you survive breakups, decode mixed signals, track no-contact, spot red flags, and date better with AI-assisted reflection, private tracking, and community verdicts.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/auth">
            <Button size="lg" className="h-12 bg-pink-500 px-8 text-base text-white hover:bg-pink-600">
              {betaEnabled ? 'Join Beta' : 'Start Free'}
            </Button>
          </Link>
          <Link href="/analyzer">
            <Button size="lg" variant="outline" className="h-12 border-zinc-700 px-8 text-base text-zinc-300 hover:bg-zinc-800">
              Try AI Analyzer
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="h-12 border-zinc-700 px-8 text-base text-zinc-300 hover:bg-zinc-800">
              See Credits
            </Button>
          </Link>
        </div>
        <div className="mx-auto mt-8 max-w-2xl">
          <InlineAlert tone="warning">
            BreakupOS is not therapy, legal advice, or crisis support. If you are dealing with abuse, stalking, harassment, threats, or self-harm risk, prioritize trusted people and emergency resources.
          </InlineAlert>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: 'OS',
              title: 'Private situationship tracker',
              description: 'Organize talking stages, dates, ghosts, no-contact cases, red flags, and emotional investment without keeping it all in your head.',
            },
            {
              icon: 'AI',
              title: 'AI relationship recovery',
              description: 'Analyze messages, draft replies, generate reports, and get safety-aware reflection without pretending this replaces therapy.',
            },
            {
              icon: 'LV',
              title: 'Love vs Red Flag feed',
              description: 'Post photo-only situations and let the community react to the situation, not judge the person. No captions or comments for now.',
            },
          ].map(feature => (
            <div
              key={feature.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-700"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-pink-500/15 text-sm font-black text-pink-200">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex min-w-max gap-4">
            {[
              { stage: 'Orbiting', cards: ['Alex', 'Jordan'] },
              { stage: 'Talking Stage', cards: ['Sam'] },
              { stage: 'Situationship', cards: ['Casey', 'Riley'] },
              { stage: 'No Contact', cards: ['The Ex'] },
              { stage: 'Ghosted Me', cards: ['Drew'] },
            ].map(col => (
              <div key={col.stage} className="w-48 shrink-0">
                <div className="mb-3 text-xs font-medium text-zinc-400">{col.stage}</div>
                <div className="space-y-2">
                  {col.cards.map(name => (
                    <div key={name} className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
                      <div className="text-sm text-white">{name}</div>
                      <div className="mt-1 flex gap-0.5">
                        {'***--'.split('').map((h, i) => (
                          <span key={`${name}-${i}`} className={i < 3 ? 'text-xs text-pink-500' : 'text-xs text-zinc-700'}>
                            {h}
                          </span>
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

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-3 text-xl font-semibold text-white">Free to join</h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Start with social feed, reactions, basic tracking, profile setup, and limited AI usage. The beta is intentionally small so feedback can shape the product safely.
            </p>
          </div>
          <div className="rounded-xl border border-pink-500/30 bg-zinc-900 p-6">
            <h2 className="mb-3 text-xl font-semibold text-white">Credits for deeper AI</h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Deeper AI actions such as message analysis, red flag reports, recovery plans, and relationship reports are protected by quotas and credits.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="mb-4 text-3xl font-bold text-white">Ready to stop spiraling and start tracking?</h2>
        <p className="mb-8 text-zinc-400">Bring your beta code. Keep private tracking private. Let public posts stay photo-only.</p>
        <Link href="/auth">
          <Button size="lg" className="h-12 bg-pink-500 px-10 text-base text-white hover:bg-pink-600">
            {betaEnabled ? 'Join Beta' : 'Get Started'}
          </Button>
        </Link>
      </section>
    </div>
  )
}
