import { cn } from '@/lib/utils'

type InlineAlertTone = 'info' | 'warning' | 'danger' | 'success'

const toneClasses: Record<InlineAlertTone, string> = {
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-100',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
  danger: 'border-red-500/20 bg-red-500/10 text-red-100',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
}

interface InlineAlertProps {
  tone?: InlineAlertTone
  title?: string
  children: React.ReactNode
  className?: string
}

export function InlineAlert({ tone = 'info', title, children, className }: InlineAlertProps) {
  return (
    <div className={cn('rounded-lg border p-4 text-sm leading-relaxed', toneClasses[tone], className)}>
      {title && <div className="mb-1 font-semibold text-white">{title}</div>}
      {children}
    </div>
  )
}
