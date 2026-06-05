'use client'

import { useEffect, useState } from 'react'
import { getCompatibilityColor, getCompatibilityLabel } from '@/lib/compatibility'

interface CompatibilityRingProps {
  score: number
  size?: number
  showLabel?: boolean
}

export function CompatibilityRing({ score, size = 80, showLabel = true }: CompatibilityRingProps) {
  const [animated, setAnimated] = useState(0)
  const color = getCompatibilityColor(score)
  const label = getCompatibilityLabel(score)

  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference - (animated / 100) * circumference

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(score), 100)
    return () => clearTimeout(timeout)
  }, [score])

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth={6}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      {showLabel && (
        <span className="text-xs text-zinc-400 text-center max-w-[80px] leading-tight">{label}</span>
      )}
    </div>
  )
}
