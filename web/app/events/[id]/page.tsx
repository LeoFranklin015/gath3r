"use client"

import { useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Video,
  Tag,
  Users,
  Loader2,
  Check,
  X,
  Clock,
  Ticket,
  QrCode,
  ScanLine,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEventDetail } from "@/app/hooks/useEventDetail"
import { useRsvp } from "@/app/hooks/useRsvp"
import { useArkivWallet } from "@/app/hooks/useArkivWallet"
import { createApproval } from "@/lib/arkiv/entities/approval"
import { CheckinQRCode } from "@/app/components/event-detail/CheckinQRCode"
import { QRScanner } from "@/app/components/event-detail/QRScanner"
import type { RsvpEntity } from "@/lib/arkiv/types"

const ONLINE_PATTERNS = [
  "zoom.us",
  "meet.google.com",
  "teams.microsoft.com",
  "discord.gg",
  "whereby.com",
  "around.co",
]

function isOnline(location: string) {
  const lower = location.toLowerCase()
  return ONLINE_PATTERNS.some((p) => lower.includes(p))
}

function short(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatEventDate(start: number, end: number) {
  const s = new Date(start * 1000)
  const e = new Date(end * 1000)
  const datePart = s.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  const startTime = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  const endTime = e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  return `${datePart} · ${startTime} – ${endTime}`
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { getClient, address } = useArkivWallet()
  const { event, rsvps, approvals, myRsvp, myApproval, myCheckin, loading, reload } =
    useEventDetail(id)
  const { rsvp, cancel } = useRsvp()

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [approvingWallet, setApprovingWallet] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Derived state
  const isHost =
    !!event && !!address && event.owner.toLowerCase() === address.toLowerCase()
  const hasActiveRsvp = !!myRsvp && myRsvp.status !== "cancelled"
  const canRsvp = !isHost && !hasActiveRsvp
  const needsApproval = !!event?.payload.requiresApproval
  const canCheckin =
    hasActiveRsvp &&
    !myCheckin &&
    (!needsApproval || myApproval?.decision === "approved")
  const activeRsvps = rsvps.filter((r) => r.status !== "cancelled")

  const handleRsvp = useCallback(async () => {
    setActionLoading("rsvp")
    try {
      await rsvp(id)
      await reload()
    } catch (e) {
      console.error("RSVP failed:", e)
    } finally {
      setActionLoading(null)
    }
  }, [rsvp, id, reload])

  const handleCancelRsvp = useCallback(async () => {
    if (!myRsvp) return
    setActionLoading("cancel")
    try {
      await cancel(myRsvp.entityKey, id)
      await reload()
    } catch (e) {
      console.error("Cancel failed:", e)
    } finally {
      setActionLoading(null)
    }
  }, [cancel, myRsvp, id, reload])

  const handleApprove = useCallback(
    async (attendeeWallet: `0x${string}`, decision: "approved" | "rejected") => {
      if (!address) return
      setApprovingWallet(attendeeWallet)
      try {
        const client = await getClient()
        await createApproval(client, {
          eventEntityKey: id,
          attendeeWallet,
          hostWallet: address,
          decision,
        })
        await reload()
      } catch (e) {
        console.error("Approval failed:", e)
      } finally {
        setApprovingWallet(null)
      }
    },
    [getClient, address, id, reload],
  )

  if (loading && !event) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm text-muted-foreground">Event not found.</p>
        <Button onClick={() => router.push("/home")} variant="outline" className="rounded-2xl">
          Back to Home
        </Button>
      </div>
    )
  }

  const p = event.payload
  const online = p.location ? isOnline(p.location) : false
  const price = p.ticketPrice ?? 0

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {/* Warm gradient wash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.96 0.03 60) 0%, oklch(0.99 0.003 85) 100%)",
        }}
      />

      {/* Hero image or gradient placeholder */}
      <div className="relative z-10">
        {p.imageUrl ? (
          <div className="relative mx-5 mt-6 aspect-video overflow-hidden rounded-2xl shadow-lg shadow-black/10">
            <Image src={p.imageUrl} alt={p.title} fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="mx-5 mt-6 aspect-video rounded-2xl" />
        )}

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute left-7 top-8 flex h-9 w-9 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm transition-colors hover:bg-background/80"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col px-6 pt-5 pb-10">
        {/* Title + Price */}
        <div className="flex items-start gap-3">
          <h1 className="flex-1 text-[22px] font-bold leading-tight text-foreground">
            {p.title}
          </h1>
          {price > 0 ? (
            <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Ticket className="h-3 w-3" />
              {price} ETH
            </span>
          ) : (
            <span className="mt-1 inline-flex shrink-0 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Free
            </span>
          )}
        </div>

        {/* Date */}
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatEventDate(p.startTime, p.endTime)}</span>
        </div>

        {/* Location */}
        {p.location && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            {online ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            <span className="line-clamp-1">{p.location}</span>
            <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium">
              {online ? "Online" : "In Person"}
            </span>
          </div>
        )}

        {/* Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {p.tags?.length > 0 &&
            p.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
        </div>

        {/* Divider */}
        <div className="my-5 h-px bg-border/60" />

        {/* Host + Attendees */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Hosted by <span className="font-medium text-foreground">{short(event.owner)}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{activeRsvps.length}</span> attending
          </span>
        </div>

        {/* Description */}
        {p.description && (
          <p className="mt-4 text-sm leading-relaxed text-foreground/70">{p.description}</p>
        )}

        {/* Divider */}
        <div className="my-5 h-px bg-border/60" />

        {/* Action Section */}
        <ActionSection
          isHost={isHost}
          canRsvp={canRsvp}
          hasActiveRsvp={hasActiveRsvp}
          needsApproval={needsApproval}
          canCheckin={canCheckin}
          myRsvp={myRsvp}
          myApproval={myApproval}
          myCheckin={myCheckin}
          actionLoading={actionLoading}
          onRsvp={handleRsvp}
          onCancelRsvp={handleCancelRsvp}
          onShowQR={() => setShowQR(true)}
          onShowScanner={() => setShowScanner(true)}
        />

        {/* Host: Attendee Management */}
        {isHost && activeRsvps.length > 0 && (
          <AttendeeList
            rsvps={activeRsvps}
            approvals={approvals}
            needsApproval={needsApproval}
            approvingWallet={approvingWallet}
            onApprove={handleApprove}
          />
        )}
      </div>

      {/* Attendee QR Display */}
      {address && (
        <CheckinQRCode
          open={showQR}
          onClose={() => setShowQR(false)}
          attendeeWallet={address}
          eventTitle={p.title}
        />
      )}

      {/* Host QR Scanner */}
      {isHost && (
        <QRScanner
          open={showScanner}
          onClose={() => setShowScanner(false)}
          eventId={id}
          rsvps={activeRsvps}
          approvals={approvals}
          needsApproval={needsApproval}
          onCheckinComplete={() => reload()}
        />
      )}
    </div>
  )
}

/* ─── Action Section ─── */

function ActionSection({
  isHost,
  canRsvp,
  hasActiveRsvp,
  needsApproval,
  canCheckin,
  myRsvp,
  myApproval,
  myCheckin,
  actionLoading,
  onRsvp,
  onCancelRsvp,
  onShowQR,
  onShowScanner,
}: {
  isHost: boolean
  canRsvp: boolean
  hasActiveRsvp: boolean
  needsApproval: boolean
  canCheckin: boolean
  myRsvp: RsvpEntity | null
  myApproval: { decision: string } | null
  myCheckin: unknown
  actionLoading: string | null
  onRsvp: () => void
  onCancelRsvp: () => void
  onShowQR: () => void
  onShowScanner: () => void
}) {
  // Host sees scan button + attendee management
  if (isHost) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
          <p className="text-sm font-medium text-foreground">You&apos;re the host</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage attendees below
          </p>
        </div>
        <Button
          onClick={onShowScanner}
          size="lg"
          className="w-full rounded-2xl py-6 text-base font-semibold shadow-md shadow-primary/20"
        >
          <ScanLine className="mr-2 h-5 w-5" />
          Scan Check-in
        </Button>
      </div>
    )
  }

  // Already checked in
  if (myCheckin) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
          <Check className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">Checked in</p>
          <p className="text-xs text-green-600">You&apos;re all set!</p>
        </div>
      </div>
    )
  }

  // Rejected
  if (myApproval?.decision === "rejected") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white">
          <X className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-800">Not approved</p>
          <p className="text-xs text-red-600">The host did not approve your request.</p>
        </div>
      </div>
    )
  }

  // Can check in (approved or no approval needed) — show QR
  if (canCheckin) {
    return (
      <div className="flex flex-col gap-3">
        {myApproval?.decision === "approved" && (
          <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Approved</span>
          </div>
        )}
        <Button
          onClick={onShowQR}
          size="lg"
          className="w-full rounded-2xl py-6 text-base font-semibold shadow-md shadow-primary/20"
        >
          <QrCode className="mr-2 h-5 w-5" />
          Show Check-in QR
        </Button>
      </div>
    )
  }

  // Pending RSVP, waiting for approval
  if (hasActiveRsvp && needsApproval) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400">
            <Clock className="h-4 w-4 text-amber-800" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Applied</p>
            <p className="text-xs text-amber-600">Waiting for host approval...</p>
          </div>
        </div>
        <Button
          onClick={onCancelRsvp}
          disabled={actionLoading === "cancel"}
          variant="outline"
          size="lg"
          className="w-full rounded-2xl py-5"
        >
          {actionLoading === "cancel" ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</>
          ) : (
            "Cancel Application"
          )}
        </Button>
      </div>
    )
  }

  // Pending RSVP, no approval needed — show "You're in" + QR check-in
  if (hasActiveRsvp && !needsApproval) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">You&apos;re in!</p>
            <p className="text-xs text-green-600">Your spot is confirmed.</p>
          </div>
        </div>
        <Button
          onClick={onShowQR}
          size="lg"
          className="w-full rounded-2xl py-6 text-base font-semibold shadow-md shadow-primary/20"
        >
          <QrCode className="mr-2 h-5 w-5" />
          Show Check-in QR
        </Button>
        <Button
          onClick={onCancelRsvp}
          disabled={actionLoading === "cancel"}
          variant="ghost"
          size="sm"
          className="rounded-2xl text-muted-foreground"
        >
          Cancel RSVP
        </Button>
      </div>
    )
  }

  // Can RSVP — main action
  if (canRsvp) {
    return (
      <Button
        onClick={onRsvp}
        disabled={actionLoading === "rsvp"}
        size="lg"
        className="w-full rounded-2xl py-6 text-base font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25"
      >
        {actionLoading === "rsvp" ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying...</>
        ) : (
          "Apply to Event"
        )}
      </Button>
    )
  }

  return null
}

/* ─── Attendee List (Host View) ─── */

function AttendeeList({
  rsvps,
  approvals,
  needsApproval,
  approvingWallet,
  onApprove,
}: {
  rsvps: RsvpEntity[]
  approvals: { attendeeWallet: string; decision: string }[]
  needsApproval: boolean
  approvingWallet: string | null
  onApprove: (wallet: `0x${string}`, decision: "approved" | "rejected") => void
}) {
  return (
    <div className="mt-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Attendees ({rsvps.length})
      </h3>
      <div className="overflow-hidden rounded-2xl border border-border">
        {rsvps.map((r, i) => {
          const approval = approvals.find(
            (a) => a.attendeeWallet.toLowerCase() === r.attendeeWallet.toLowerCase(),
          )
          const isApproving = approvingWallet?.toLowerCase() === r.attendeeWallet.toLowerCase()

          return (
            <div
              key={r.entityKey}
              className={`flex items-center justify-between bg-card px-4 py-3 ${
                i < rsvps.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-foreground">
                  {short(r.attendeeWallet)}
                </span>
                {approval ? (
                  <StatusBadge decision={approval.decision} />
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    Pending
                  </span>
                )}
              </div>

              {/* Approve/Reject buttons */}
              {needsApproval && !approval && (
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
