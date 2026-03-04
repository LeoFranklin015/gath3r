"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Loader2, Check, AlertCircle } from "lucide-react"
import { useArkivWallet } from "@/app/hooks/useArkivWallet"
import { createCheckin, getCheckin } from "@/lib/arkiv/entities/checkin"
import type { RsvpEntity } from "@/lib/arkiv/types"

type ScanState =
  | { status: "scanning" }
  | { status: "processing" }
  | { status: "success"; wallet: string }
  | { status: "error"; message: string }

interface QRScannerProps {
  open: boolean
  onClose: () => void
  eventId: string
  rsvps: RsvpEntity[]
  approvals: { attendeeWallet: string; decision: string }[]
  needsApproval: boolean
  onCheckinComplete: () => void
}

function short(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function QRScanner({
  open,
  onClose,
  eventId,
  rsvps,
  approvals,
  needsApproval,
  onCheckinComplete,
}: QRScannerProps) {
  const { getClient } = useArkivWallet()
  const [scanState, setScanState] = useState<ScanState>({ status: "scanning" })
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null)
  const processingRef = useRef(false)

  // Keep latest props in refs so the camera effect doesn't re-run on polling updates
  const rsvpsRef = useRef(rsvps)
  const approvalsRef = useRef(approvals)
  const needsApprovalRef = useRef(needsApproval)
  const getClientRef = useRef(getClient)
  const onCheckinCompleteRef = useRef(onCheckinComplete)

  useEffect(() => { rsvpsRef.current = rsvps }, [rsvps])
  useEffect(() => { approvalsRef.current = approvals }, [approvals])
  useEffect(() => { needsApprovalRef.current = needsApproval }, [needsApproval])
  useEffect(() => { getClientRef.current = getClient }, [getClient])
  useEffect(() => { onCheckinCompleteRef.current = onCheckinComplete }, [onCheckinComplete])

  const handleScan = useCallback(
    async (decodedText: string) => {
      if (processingRef.current) return
      processingRef.current = true
      setScanState({ status: "processing" })

      // Pause scanner
      try { scannerRef.current?.pause(true) } catch { /* ok */ }

      try {
        const wallet = decodedText.trim()

        // Validate wallet address format
        if (!wallet.startsWith("0x") || wallet.length !== 42) {
          setScanState({ status: "error", message: "Not a valid wallet address" })
          processingRef.current = false
          return
        }

        const walletAddr = wallet as `0x${string}`

        // Check RSVP exists
        const matchedRsvp = rsvpsRef.current.find(
          (r) => r.attendeeWallet.toLowerCase() === walletAddr.toLowerCase() && r.status !== "cancelled"
        )
        if (!matchedRsvp) {
          setScanState({ status: "error", message: "No active RSVP found for this attendee" })
          processingRef.current = false
          return
        }

        // Check approval if required
        if (needsApprovalRef.current) {
          const approval = approvalsRef.current.find(
            (a) => a.attendeeWallet.toLowerCase() === walletAddr.toLowerCase() && a.decision === "approved"
          )
          if (!approval) {
            setScanState({ status: "error", message: "Attendee has not been approved yet" })
            processingRef.current = false
            return
          }
        }

        // Check not already checked in
        const existing = await getCheckin(eventId, walletAddr)
        if (existing) {
          setScanState({ status: "error", message: "Already checked in" })
          processingRef.current = false
          return
        }

        // Create check-in on-chain
        const client = await getClientRef.current()
        await createCheckin(client, {
          eventEntityKey: eventId,
          attendeeWallet: walletAddr,
          method: "qr",
          proof: walletAddr,
        })

        setScanState({ status: "success", wallet })
        navigator.vibrate?.(200)
        onCheckinCompleteRef.current()

        // Auto-resume after 2.5s
        setTimeout(() => {
          setScanState({ status: "scanning" })
          processingRef.current = false
          try { scannerRef.current?.resume() } catch { /* ok */ }
        }, 2500)
      } catch (e) {
        console.error("Check-in failed:", e)
        setScanState({ status: "error", message: "Check-in transaction failed. Try again." })
        processingRef.current = false
      }
    },
    [eventId], // only depends on eventId which is stable
  )

  // Start / stop camera — only re-runs when open changes
  useEffect(() => {
    if (!open) return

    let html5Qrcode: import("html5-qrcode").Html5Qrcode | null = null
    let mounted = true

    async function startScanner() {
      // Small delay to ensure the DOM element is rendered
      await new Promise((r) => setTimeout(r, 100))
      if (!mounted) return

      const el = document.getElementById("qr-reader")
      if (!el) return

      const { Html5Qrcode } = await import("html5-qrcode")
      if (!mounted) return

      html5Qrcode = new Html5Qrcode("qr-reader")
      scannerRef.current = html5Qrcode

      try {
        await html5Qrcode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => { handleScan(decodedText) },
          () => { /* ignore scan errors */ },
        )
      } catch (err) {
        console.error("Camera start failed:", err)
        if (mounted) {
          setScanState({ status: "error", message: "Camera access required. Enable in browser settings." })
        }
      }
    }

    startScanner()

    return () => {
      mounted = false
      if (html5Qrcode) {
        html5Qrcode.stop().catch(() => {})
        try { html5Qrcode.clear() } catch { /* ok */ }
        scannerRef.current = null
      }
    }
  }, [open, handleScan])

  // Lock body scroll
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open])

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setScanState({ status: "scanning" })
      processingRef.current = false
    }
  }, [open])

  if (!open) return null

  const handleRetry = () => {
    if (scanState.status !== "error") return
    setScanState({ status: "scanning" })
    processingRef.current = false
    try { scannerRef.current?.resume() } catch { /* ok */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Scan line keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0%, 100% { top: 0; }
          50% { top: calc(100% - 2px); }
        }
        #qr-reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        #qr-reader img[alt="Info icon"] { display: none !important; }
        #qr-reader > div:last-child { display: none !important; }
      `}} />

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-14 pb-4">
        <h2 className="text-lg font-bold text-white">Scan Check-in</h2>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Camera viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <div id="qr-reader" className="h-full w-full" />

        {/* Viewfinder overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-64 w-64">
            {/* Corner marks */}
            <div className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-[3px] border-t-[3px] border-white/80" />
            <div className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-[3px] border-t-[3px] border-white/80" />
            <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-white/80" />
            <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-white/80" />

            {/* Scan line */}
            {scanState.status === "scanning" && (
              <div
                className="absolute left-2 right-2 h-0.5 bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                style={{ animation: "scanline 2s ease-in-out infinite" }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="relative z-20 rounded-t-3xl bg-black/90 px-6 py-6 backdrop-blur-sm">
        {scanState.status === "scanning" && (
          <p className="text-center text-sm text-white/60">
            Point camera at attendee&apos;s QR code
          </p>
        )}

        {scanState.status === "processing" && (
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
            <p className="text-sm font-medium text-white">Verifying check-in...</p>
          </div>
        )}

        {scanState.status === "success" && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
              <Check className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-green-400">Checked in!</p>
            <p className="font-mono text-xs text-white/50">{short(scanState.wallet)}</p>
          </div>
        )}

        {scanState.status === "error" && (
          <button onClick={handleRetry} className="flex w-full flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-medium text-red-400">{scanState.message}</p>
            <p className="text-xs text-white/40">Tap to scan again</p>
          </button>
        )}
      </div>
    </div>
  )
}
