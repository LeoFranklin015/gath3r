"use client"

import { useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { X } from "lucide-react"

interface CheckinQRCodeProps {
  open: boolean
  onClose: () => void
  attendeeWallet: string
  eventTitle: string
}

export function CheckinQRCode({ open, onClose, attendeeWallet, eventTitle }: CheckinQRCodeProps) {
  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  // Lock body scroll
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div
        className="relative z-10 mx-5 flex w-full max-w-sm flex-col items-center rounded-3xl bg-white px-6 py-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Event title */}
        <p className="mb-1 max-w-[80%] truncate text-center text-sm font-medium text-muted-foreground">
          {eventTitle}
        </p>

        {/* Instruction */}
        <h2 className="mb-6 text-lg font-bold text-foreground">
          Show this to the host
        </h2>

        {/* QR Code */}
        <div className="rounded-2xl bg-white p-4 shadow-inner ring-1 ring-border/40">
          <QRCodeSVG
            value={attendeeWallet}
            size={240}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        {/* Wallet address */}
        <p className="mt-5 max-w-full break-all text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
          {attendeeWallet}
        </p>
      </div>
    </div>
  )
}
