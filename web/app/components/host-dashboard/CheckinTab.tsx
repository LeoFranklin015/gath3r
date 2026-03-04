"use client"

import { useState, useCallback } from "react"
import { ScanLine, UserCheck, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QRScanner } from "@/app/components/event-detail/QRScanner"
import { useArkivWallet } from "@/app/hooks/useArkivWallet"
import { createCheckin } from "@/lib/arkiv/entities/checkin"
import type { RsvpEntity, ApprovalEntity, CheckinEntity } from "@/lib/arkiv/types"

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

interface CheckinTabProps {
  eventId: string
  rsvps: RsvpEntity[]
  approvals: ApprovalEntity[]
  checkins: CheckinEntity[]
  needsApproval: boolean
  onReload: () => void
}

export function CheckinTab({
  eventId,
  rsvps,
  approvals,
  checkins,
  needsApproval,
  onReload,
}: CheckinTabProps) {
  const { getClient, address } = useArkivWallet()
  const [showScanner, setShowScanner] = useState(false)
  const [manualWallet, setManualWallet] = useState("")
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  const checkedInWallets = new Set(checkins.map((c) => c.attendeeWallet.toLowerCase()))

  // Eligible for manual checkin: has RSVP, approved (if needed), not already checked in
  const eligible = rsvps.filter((r) => {
    if (checkedInWallets.has(r.attendeeWallet.toLowerCase())) return false
    if (needsApproval) {
      const approval = approvals.find(
        (a) => a.attendeeWallet.toLowerCase() === r.attendeeWallet.toLowerCase(),
      )
      if (!approval || approval.decision !== "approved") return false
    }
    return true
  })

  const handleManualCheckin = useCallback(async () => {
    if (!manualWallet || !address) return
    setManualLoading(true)
    setManualError(null)
    try {
      const client = await getClient()
      await createCheckin(client, {
        eventEntityKey: eventId,
        attendeeWallet: manualWallet as `0x${string}`,
        method: "manual",
        proof: address,
      })
      setManualWallet("")
      onReload()
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "Check-in failed")
    } finally {
      setManualLoading(false)
    }
  }, [manualWallet, address, getClient, eventId, onReload])

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
        <p className="text-sm font-medium text-foreground">
          {checkins.length} checked in
          <span className="text-muted-foreground"> / {rsvps.length} registered</span>
        </p>
      </div>

      {/* Scan QR */}
      <Button
        onClick={() => setShowScanner(true)}
        size="lg"
        className="w-full rounded-2xl py-6 text-base font-semibold shadow-md shadow-primary/20"
      >
        <ScanLine className="mr-2 h-5 w-5" />
        Scan QR Code
      </Button>

      {/* Manual check-in */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          Manual Check-in
        </p>
        {eligible.length === 0 ? (
          <p className="text-xs text-muted-foreground">No eligible attendees to check in</p>
        ) : (
          <>
            <select
              value={manualWallet}
              onChange={(e) => setManualWallet(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
            >
              <option value="">Select attendee...</option>
              {eligible.map((r) => (
                <option key={r.entityKey} value={r.attendeeWallet}>
                  {short(r.attendeeWallet)}
                </option>
              ))}
            </select>
            <Button
              onClick={handleManualCheckin}
              disabled={!manualWallet || manualLoading}
              variant="outline"
              className="mt-3 w-full rounded-xl"
            >
              {manualLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking in...</>
              ) : (
                <><UserCheck className="mr-2 h-4 w-4" /> Check In</>
              )}
            </Button>
            {manualError && (
              <p className="mt-2 text-xs text-destructive">{manualError}</p>
            )}
          </>
        )}
      </div>

      {/* Checked-in list */}
      {checkins.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Checked-in attendees</p>
          <div className="overflow-hidden rounded-2xl border border-border">
            {checkins.map((c, i) => (
              <div
                key={c.attendeeWallet}
                className={`flex items-center gap-2.5 bg-card px-4 py-3 ${
                  i < checkins.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-3 w-3 text-green-700" />
                </div>
                <span className="font-mono text-xs text-foreground">
                  {short(c.attendeeWallet)}
                </span>
                <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {c.method}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Scanner modal */}
      <QRScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        eventId={eventId}
        rsvps={rsvps}
        approvals={approvals}
        needsApproval={needsApproval}
        onCheckinComplete={() => onReload()}
      />
    </div>
  )
}
