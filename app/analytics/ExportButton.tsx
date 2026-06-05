'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ExportButtonProps {
  isPro: boolean
}

export function ExportButton({ isPro }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (!isPro) {
      toast.error('Data export is a Pro feature. Upgrade to download your data.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/export?format=csv')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Export failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `breakupos-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 shrink-0"
      onClick={handleExport}
      disabled={loading}
      title={isPro ? 'Download all your data as CSV' : 'Pro feature'}
    >
      {loading ? 'Exporting...' : 'Export CSV'}
    </Button>
  )
}
