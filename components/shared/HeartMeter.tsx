'use client'

interface HeartMeterProps {
  value: number // 1–10
  max?: number
  size?: 'sm' | 'md'
}

export function HeartMeter({ value, max = 10, size = 'sm' }: HeartMeterProps) {
  const hearts = max === 5 ? Math.round(value / 2) : Math.ceil(value / 2)
  const totalHearts = 5
  const sz = size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <span className={`flex gap-0.5 ${sz}`} title={`Emotional investment: ${value}/10`}>
      {Array.from({ length: totalHearts }, (_, i) => (
        <span
          key={i}
          className={i < hearts ? 'text-pink-500' : 'text-zinc-700'}
        >
          ♥
        </span>
      ))}
    </span>
  )
}
