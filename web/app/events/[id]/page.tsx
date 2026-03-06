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
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEventDetail } from "@/app/hooks/useEventDetail"
import { useRsvp } from "@/app/hooks/useRsvp"
import { useArkivWallet } from "@/app/hooks/useArkivWallet"
import { useWallets } from "@privy-io/react-auth"
import { arbitrumSepolia } from "@/lib/chains"
import { AppHeader } from "@/app/components/AppHeader"
import { createApproval } from "@/lib/arkiv/entities/approval"
import { publishEvent } from "@/lib/arkiv/entities/event"
import { CheckinQRCode } from "@/app/components/event-detail/CheckinQRCode"
import { QRScanner } from "@/app/components/event-detail/QRScanner"
import { ENSName } from "@/app/components/ENSName"
import type { RsvpEntity, CheckinEntity } from "@/lib/arkiv/types"

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
  const { wallets } = useWallets()
  const { event, rsvps, approvals, checkins, myRsvp, myApproval, myCheckin, loading, reload } =
    useEventDetail(id)
  const { rsvp, cancel } = useRsvp()

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [approvingWallet, setApprovingWallet] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Derived state
  const isHost =
    !!event && !!address && event.owner.toLowerCase() === address.toLowerCase()
  const isDraft = isHost && event?.status === "draft"
  const hasActiveRsvp = !!myRsvp && myRsvp.status !== "cancelled"
  const canRsvp = !isHost && !hasActiveRsvp && !isDraft
  const needsApproval = !!event?.payload.requiresApproval
  const canCheckin =
    hasActiveRsvp &&
    !myCheckin &&
    (!needsApproval || myApproval?.decision === "approved")
  const activeRsvps = rsvps.filter((r) => r.status !== "cancelled")

  const handleRsvp = useCallback(async () => {
    setActionLoading("rsvp")
    try {
      let paymentTxHash: string | undefined
      // If paid event, transfer ticket fee to host on Arbitrum Sepolia
      // (Kaolin only supports Arkiv entity transactions, not plain ETH transfers)
      const ticketPrice = event?.payload.ticketPrice ?? 0
      if (ticketPrice > 0 && event && address) {
        const embeddedWallet = wallets.find(w => w.walletClientType === "privy")
        if (!embeddedWallet) throw new Error("No embedded wallet found")
        await embeddedWallet.switchChain(arbitrumSepolia.id)
        const provider = await embeddedWallet.getEthereumProvider()
        const weiValue = BigInt(Math.round(ticketPrice * 1e18))
        paymentTxHash = await provider.request({
          method: "eth_sendTransaction",
          params: [{
            from: address,
            to: event.owner,
            value: "0x" + weiValue.toString(16),
          }],
        })
      }
      // Create RSVP entity on Kaolin (useRsvp switches back to Kaolin internally)
      await rsvp(id, undefined, paymentTxHash)
      await reload()
    } catch (e) {
      console.error("RSVP failed:", e)
    } finally {
      setActionLoading(null)
    }
  }, [rsvp, id, reload, event, address, wallets])

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

  const handlePublish = useCallback(async () => {
    if (!event || !address) return
    setActionLoading("publish")
    try {
      const client = await getClient()
      await publishEvent(
        client,
        id,
        event.payload,
        event.payload.location,
        event.payload.startTime,
        address,
      )
      await reload()
    } catch (e) {
      console.error("Publish failed:", e)
    } finally {
      setActionLoading(null)
    }
  }, [event, address, getClient, id, reload])

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

      <AppHeader backHref="/home" />

      {/* Hero image or gradient placeholder */}
      <div className="relative z-10">
        {p.imageUrl ? (
          <div className="relative mx-5 aspect-square overflow-hidden rounded-2xl shadow-lg shadow-black/10">
            <Image src={p.imageUrl} alt={p.title} fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="mx-5 aspect-square rounded-2xl" />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col px-6 pt-5 pb-28">
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
          ) : needsApproval ? (
            <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
              <ShieldCheck className="h-3 w-3" />
              Invite Only
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
            Hosted by <ENSName address={event.owner} className="font-medium text-foreground" />
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

        {/* Inline Status */}
        <InlineStatus
          isHost={isHost}
          isDraft={!!isDraft}
          hasActiveRsvp={hasActiveRsvp}
          needsApproval={needsApproval}
          canCheckin={canCheckin}
          myApproval={myApproval}
          myCheckin={myCheckin}
        />

        {/* Host: Attendee Management */}
        {isHost && activeRsvps.length > 0 && (
          <AttendeeList
            rsvps={activeRsvps}
            approvals={approvals}
            checkins={checkins}
            needsApproval={needsApproval}
            approvingWallet={approvingWallet}
            onApprove={handleApprove}
          />
        )}
      </div>

      {/* Fixed Bottom Action Bar */}
      <BottomActionBar
        isHost={isHost}
        isDraft={!!isDraft}
        canRsvp={canRsvp}
        hasActiveRsvp={hasActiveRsvp}
        needsApproval={needsApproval}
        canCheckin={canCheckin}
        myCheckin={myCheckin}
        actionLoading={actionLoading}
        ticketPrice={price}
        onRsvp={handleRsvp}
        onCancelRsvp={handleCancelRsvp}
        onPublish={handlePublish}
        onShowQR={() => setShowQR(true)}
        onShowScanner={() => setShowScanner(true)}
      />

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

/* ─── Inline Status (shown in content area) ─── */

function InlineStatus({
  isHost,
  isDraft,
  hasActiveRsvp,
  needsApproval,
  canCheckin,
  myApproval,
  myCheckin,
}: {
  isHost: boolean
  isDraft: boolean
  hasActiveRsvp: boolean
  needsApproval: boolean
  canCheckin: boolean
  myApproval: { decision: string } | null
  myCheckin: unknown
}) {
  if (isHost && isDraft) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-500 text-white">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-800">Draft</p>
          <p className="text-xs text-zinc-500">This event is not published yet</p>
        </div>
      </div>
    )
  }

  if (isHost) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
        <p className="text-sm font-medium text-foreground">You&apos;re the host</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Manage attendees below</p>
      </div>
    )
  }

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

  if (canCheckin && myApproval?.decision === "approved") {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
        <Check className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-800">Approved</span>
      </div>
    )
  }

  if (hasActiveRsvp && needsApproval) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400">
          <Clock className="h-4 w-4 text-amber-800" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800">Applied</p>
          <p className="text-xs text-amber-600">Waiting for host approval...</p>
        </div>
      </div>
    )
  }

  if (hasActiveRsvp && !needsApproval) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
          <Check className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">You&apos;re in!</p>
          <p className="text-xs text-green-600">Your spot is confirmed.</p>
        </div>
      </div>
    )
  }

  return null
}

/* ─── Fixed Bottom Action Bar ─── */

function BottomActionBar({
  isHost,
  isDraft,
  canRsvp,
  hasActiveRsvp,
  needsApproval,
  canCheckin,
  myCheckin,
  actionLoading,
  ticketPrice,
  onRsvp,
  onCancelRsvp,
  onPublish,
  onShowQR,
  onShowScanner,
}: {
  isHost: boolean
  isDraft: boolean
  canRsvp: boolean
  hasActiveRsvp: boolean
  needsApproval: boolean
  canCheckin: boolean
  myCheckin: unknown
  actionLoading: string | null
  ticketPrice: number
  onRsvp: () => void
  onCancelRsvp: () => void
  onPublish: () => void
  onShowQR: () => void
  onShowScanner: () => void
}) {
  let content: React.ReactNode = null

  if (isHost && isDraft) {
    content = (
      <Button
        onClick={onPublish}
        disabled={actionLoading === "publish"}
        size="lg"
        className="w-full rounded-2xl py-6 text-base font-semibold shadow-md shadow-primary/20"
      >
        {actionLoading === "publish" ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</>
        ) : (
          "Publish Event"
        )}
      </Button>
    )
  } else if (isHost) {
    content = (
      <Button
        onClick={onShowScanner}
        size="lg"
        className="w-full rounded-2xl py-6 text-base font-semibold shadow-md shadow-primary/20"
      >
        <ScanLine className="mr-2 h-5 w-5" />
        Scan Check-in
      </Button>
    )
  } else if (myCheckin) {
    return null
  } else if (canCheckin) {
    content = (
      <div className="flex flex-col gap-2">
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
  } else if (hasActiveRsvp && needsApproval) {
    content = (
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
    )
  } else if (hasActiveRsvp && !needsApproval) {
    content = (
      <div className="flex flex-col gap-2">
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
  } else if (canRsvp) {
    content = (
      <Button
        onClick={onRsvp}
        disabled={actionLoading === "rsvp"}
        size="lg"
        className="w-full rounded-2xl py-6 text-base font-semibold shadow-md shadow-primary/20"
      >
        {actionLoading === "rsvp" ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {ticketPrice > 0 ? "Processing Payment..." : "Applying..."}</>
        ) : ticketPrice > 0 ? (
          <><Ticket className="mr-2 h-4 w-4" /> Pay {ticketPrice} ETH & Apply</>
        ) : (
          "Apply to Event"
        )}
      </Button>
    )
  }

  if (!content) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/80 px-6 pb-6 pt-3 backdrop-blur-lg">
      {content}
    </div>
  )
}

/* ─── Attendee List (Host View) with Tabs ─── */

function AttendeeList({
  rsvps,
  approvals,
  checkins,
  needsApproval,
  approvingWallet,
  onApprove,
}: {
  rsvps: RsvpEntity[]
  approvals: { attendeeWallet: string; decision: string }[]
  checkins: CheckinEntity[]
  needsApproval: boolean
  approvingWallet: string | null
  onApprove: (wallet: `0x${string}`, decision: "approved" | "rejected") => void
}) {
  const [tab, setTab] = useState<"pending" | "checked-in">("pending")

  const checkedInWallets = new Set(
    checkins.map((c) => c.attendeeWallet.toLowerCase()),
  )

  const checkedInRsvps = rsvps.filter((r) =>
    checkedInWallets.has(r.attendeeWallet.toLowerCase()),
  )
  const pendingRsvps = rsvps.filter(
    (r) => !checkedInWallets.has(r.attendeeWallet.toLowerCase()),
  )

  const activeList = tab === "checked-in" ? checkedInRsvps : pendingRsvps

  return (
    <div className="mt-5">
      {/* Tab bar */}
      <div className="mb-3 flex gap-1 rounded-xl bg-muted/60 p-1">
        <button
          onClick={() => setTab("pending")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
            tab === "pending"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Pending
          {pendingRsvps.length > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-bold text-amber-700">
              {pendingRsvps.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("checked-in")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
            tab === "checked-in"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Checked In
          {checkedInRsvps.length > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-green-100 px-1 text-[10px] font-bold text-green-700">
              {checkedInRsvps.length}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      {activeList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            {tab === "checked-in" ? "No one has checked in yet" : "No pending attendees"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          {activeList.map((r, i) => {
            const approval = approvals.find(
              (a) => a.attendeeWallet.toLowerCase() === r.attendeeWallet.toLowerCase(),
            )
            const isCheckedIn = checkedInWallets.has(r.attendeeWallet.toLowerCase())
            const isApproving = approvingWallet?.toLowerCase() === r.attendeeWallet.toLowerCase()

            return (
              <div
                key={r.entityKey}
                className={`flex items-center justify-between bg-card px-4 py-3 ${
                  i < activeList.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <ENSName address={r.attendeeWallet} className="font-mono text-xs text-foreground" />
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

                {/* Approve/Reject buttons — only on pending tab, only if needs approval */}
                {!isCheckedIn && needsApproval && !approval && (
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
      )}
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
