import Link from 'next/link'
import { BlockedUsersClient } from '@/components/Safety/BlockedUsersClient'

const sections = [
  {
    title: 'Dating Safety',
    body: 'Keep first meetings public, tell a trusted person where you are going, and avoid sharing addresses, financial details, workplace routines, or identity documents early.',
  },
  {
    title: 'Harassment, Blocking, And Reports',
    body: 'If someone pressures you, threatens you, repeatedly contacts you after a boundary, or makes you uncomfortable, stop engaging. Use block and report. Old messages stay visible so you can keep context.',
  },
  {
    title: 'Scam Warning Signs',
    body: 'Be cautious with urgent money requests, investment pitches, links, gift cards, crypto claims, identity verification outside the app, and stories that escalate unusually fast.',
  },
  {
    title: 'Underage And Minor Safety',
    body: 'Breakup OS Dating is for adults. Report any underage concern immediately. Do not continue conversations that suggest someone may be a minor.',
  },
  {
    title: 'Crisis And Self-Harm',
    body: 'This app is not crisis support, therapy, legal advice, or emergency help. If there is immediate danger, contact local emergency services or a qualified crisis resource.',
  },
  {
    title: 'Privacy And AI Limits',
    body: 'AI can be wrong. Treat analysis as reflection, not proof. Avoid pasting highly sensitive data unless you understand the risk. Screenshots are not stored by default unless a feature explicitly says otherwise.',
  },
]

export default function SafetyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-300">Safety Center</p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Date with clarity, not pressure</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Concise guidance for dating, chat, privacy, AI limits, and what to do when something feels unsafe.
        </p>
      </div>
      <div className="grid gap-4">
        {sections.map(section => (
          <section key={section.title} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{section.body}</p>
          </section>
        ))}
      </div>
      <div className="mt-6">
        <BlockedUsersClient />
      </div>
      <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
        Need data controls? Visit <Link href="/privacy" className="font-medium underline">Privacy</Link> to export or delete your data.
      </div>
    </main>
  )
}
