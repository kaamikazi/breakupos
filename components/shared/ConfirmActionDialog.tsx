'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmActionDialogProps {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  confirming?: boolean
  destructive?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

export function ConfirmActionDialog({
  open,
  title,
  body,
  confirmLabel,
  confirming = false,
  destructive = false,
  onOpenChange,
  onConfirm,
}: ConfirmActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-zinc-800 bg-zinc-950 text-zinc-100" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-zinc-400">{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-zinc-800 bg-zinc-900/80">
          <Button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className={destructive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-pink-500 text-white hover:bg-pink-600'}
          >
            {confirming ? 'Working...' : confirmLabel}
          </Button>
          <DialogClose render={<Button type="button" variant="outline" className="border-zinc-700 text-zinc-100" autoFocus />}>
            Cancel
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
