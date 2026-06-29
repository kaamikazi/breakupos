export default function OnboardingLoading() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-5 py-4 text-center shadow-2xl shadow-black/20">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-pink-500" />
        <p className="text-sm font-semibold text-white">Loading Breakup OS...</p>
      </div>
    </div>
  )
}
