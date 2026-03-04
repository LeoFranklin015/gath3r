"use client"

import { useState } from "react"
import { Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { RsvpEntity, ApprovalEntity, CheckinEntity } from "@/lib/arkiv/types"

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

interface RegistrationsTabProps {
  rsvps: RsvpEntity[]
  approvals: ApprovalEntity[]
  checkins: CheckinEntity[]
  needsApproval: boolean
  approvingWallet: string | null
  onApprove: (wallet: `0x${string}`, decision: "approved" | "rejected") => void
  onBatchApprove: (wallets: `0x${string}`[], decision: "approved" | "rejected") => void
  batchProgress: { current: number; total: number } | null
}

export function RegistrationsTab({
  rsvps,
  approvals,
  checkins,
  needsApproval,
  approvingWallet,
  onApprove,
  onBatchApprove,
  batchProgress,
}: RegistrationsTabProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const checkedInWallets = new Set(checkins.map((c) => c.attendeeWallet.toLowerCase()))

  // Pending = has RSVP, no approval yet, not checked in
  const pendingWallets = rsvps
    .filter((r) => {
      if (checkedInWallets.has(r.attendeeWallet.toLowerCase())) return false
      const hasApproval = approvals.some(
        (a) => a.attendeeWallet.toLowerCase() === r.attendeeWallet.toLowerCase(),
      )
      return !hasApproval
    })
    .map((r) => r.attendeeWallet)

  const toggleSelect = (wallet: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(wallet)) next.delete(wallet)
      else next.add(wallet)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === pendingWallets.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pendingWallets))
    }
  }

  const handleBatch = (decision: "approved" | "rejected") => {
    const wallets = Array.from(selected) as `0x${string}`[]
    if (wallets.length === 0) return
    onBatchApprove(wallets, decision)
    setSelected(new Set())
  }

  if (rsvps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
          <span className="text-lg opacity-50">📋</span>
        </div>
        <p className="text-sm text-muted-foreground">No registrations yet</p>
      </div>
    )
  }

  const isBatching = !!batchProgress

  return (
    <div>
      <p className="mb-3 text-xs font-medium text-muted-foreground">
        {rsvps.length} registered
      </p>

      {/* Batch actions */}
      {needsApproval && pendingWallets.length > 0 && (
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={toggleAll}
            disabled={isBatching}
            className="flex items-center gap-2 text-xs font-medium text-primary"
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                selected.size === pendingWallets.length && pendingWallets.length > 0
                  ? "border-primary bg-primary text-white"
                  : "border-border"
              }`}
            >
              {selected.size === pendingWallets.length && pendingWallets.length > 0 && (
                <Check className="h-2.5 w-2.5" />
              )}
            </div>
            Select all pending ({pendingWallets.length})
          </button>

          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              {isBatching ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {batchProgress.current}/{batchProgress.total}
                </span>
              ) : (
                <>
                  <Button
                    onClick={() => handleBatch("approved")}
                    size="sm"
                    className="h-7 rounded-lg bg-green-600 px-3 text-[11px] font-semibold text-white hover:bg-green-700"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Approve ({selected.size})
                  </Button>
                  <Button
                    onClick={() => handleBatch("rejected")}
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg border-red-200 px-3 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border">
        {rsvps.map((r, i) => {
          const approval = approvals.find(
            (a) => a.attendeeWallet.toLowerCase() === r.attendeeWallet.toLowerCase(),
          )
          const isCheckedIn = checkedInWallets.has(r.attendeeWallet.toLowerCase())
          const isApproving = approvingWallet?.toLowerCase() === r.attendeeWallet.toLowerCase()
          const isPending = !isCheckedIn && needsApproval && !approval
          const isSelected = selected.has(r.attendeeWallet)

          return (
            <div
              key={r.entityKey}
              className={`flex items-center justify-between bg-card px-4 py-3 ${
                i < rsvps.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                {/* Checkbox for pending items */}
                {isPending && (
                  <button
                    onClick={() => toggleSelect(r.attendeeWallet)}
                    disabled={isBatching}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5" />}
                  </button>
                )}
                <span className="font-mono text-xs text-foreground">
                  {short(r.attendeeWallet)}
                </span>
                {isCheckedIn ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                    <Check className="h-2.5 w-2.5" />
                    Checked in
                  </span>
                ) : approval ? (
                  <StatusBadge decision={approval.decision} />
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    Pending
                  </span>
                )}
              </div>

              {/* Individual approve/reject — only when not in batch mode */}
              {isPending && !isBatching && (
                <div className="flex items-center gap-1.5">
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <button
                        onClick={() => onApprove(r.attendeeWallet, "approved")}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700 transition-colors hover:bg-green-200"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onApprove(r.attendeeWallet, "rejected")}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-700 transition-colors hover:bg-red-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ decision }: { decision: string }) {
  if (decision === "approved") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
        Approved
      </span>
    )
  }
  if (decision === "rejected") {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
        Rejected
      </span>
    )
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
      {decision}
    </span>
  )
}
