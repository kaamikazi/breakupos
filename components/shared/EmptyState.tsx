import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon = '•', title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
      <div className="mb-3 text-4xl" aria-hidden="true">{icon}</div>
      <h2 className="mb-2 text-lg font-semibold text-white">{title}</h2>
      <p className="mx-auto mb-5 max-w-lg text-sm leading-relaxed text-zinc-400">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
