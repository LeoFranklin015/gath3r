"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { usePrivy } from "@privy-io/react-auth"
import {
  Calendar,
  MapPin,
  Video,
  Users,
  Loader2,
} from "lucide-react"
import { AppHeader } from "@/app/components/AppHeader"
import { useEventDetail } from "@/app/hooks/useEventDetail"
import { useArkivWallet } from "@/app/hooks/useArkivWallet"
import { createApproval } from "@/lib/arkiv/entities/approval"
import { publishEvent } from "@/lib/arkiv/entities/event"
import { Button } from "@/components/ui/button"
import { RegistrationsTab } from "@/app/components/host-dashboard/RegistrationsTab"
import { CheckinTab } from "@/app/components/host-dashboard/CheckinTab"
import { EmailTab } from "@/app/components/host-dashboard/EmailTab"
import { PoapTab } from "@/app/components/host-dashboard/PoapTab"

type Tab = "registrations" | "checkin" | "email" | "poap"

const TABS: { key: Tab; label: string }[] = [
  { key: "registrations", label: "Registrations" },
  { key: "checkin", label: "Check-in" },
  { key: "email", label: "Email" },
  { key: "poap", label: "POAP" },
]

function formatDate(start: number, end: number) {
  const s = new Date(start * 1000)
  const e = new Date(end * 1000)
  const date = s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  const t1 = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  const t2 = e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  return `${date} · ${t1} – ${t2}`
}

function isOnline(loc: string) {
  return ["zoom.us", "meet.google.com", "teams.microsoft.com", "discord.gg"].some((p) =>
    loc.toLowerCase().includes(p),
  )
}

export default function HostDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { ready, authenticated } = usePrivy()
  const { getClient, address } = useArkivWallet()
  const { event, rsvps, approvals, checkins, loading, reload } = useEventDetail(id)

  const [tab, setTab] = useState<Tab>("registrations")
  const [approvingWallet, setApprovingWallet] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)

  const isHost = !!event && !!address && event.owner.toLowerCase() === address.toLowerCase()
  const isDraft = event?.status === "draft"
  const activeRsvps = rsvps.filter((r) => r.status !== "cancelled")
  const needsApproval = !!event?.payload.requiresApproval
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (ready && !authenticated) router.replace("/")
  }, [ready, authenticated, router])

  // Redirect non-hosts to attendee view
  useEffect(() => {
    if (!loading && event && address && !isHost) {
      router.replace(`/events/${id}`)
    }
  }, [loading, event, address, isHost, router, id])

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
    setPublishing(true)
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
      setPublishing(false)
    }
  }, [event, address, getClient, id, reload])

  const handleBatchApprove = useCallback(
    async (wallets: `0x${string}`[], decision: "approved" | "rejected") => {
      if (!address) return
      setBatchProgress({ current: 0, total: wallets.length })
      try {
        const client = await getClient()
        for (let i = 0; i < wallets.length; i++) {
          setBatchProgress({ current: i + 1, total: wallets.length })
          await createApproval(client, {
            eventEntityKey: id,
            attendeeWallet: wallets[i],
            hostWallet: address,
            decision,
          })
        }
        await reload()
      } catch (e) {
        console.error("Batch approval failed:", e)
      } finally {
        setBatchProgress(null)
      }
    },
    [getClient, address, id, reload],
  )

  if (!ready || !authenticated || (loading && !event)) {
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
        <button onClick={() => router.push("/events/hosted")} className="text-sm text-primary hover:underline">
          Back to My Events
        </button>
      </div>
    )
  }

  const p = event.payload
  const online = p.location ? isOnline(p.location) : false

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {/* Warm gradient wash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background: "linear-gradient(180deg, oklch(0.96 0.03 60) 0%, oklch(0.99 0.003 85) 100%)",
        }}
      />

      <AppHeader backHref="/events/hosted" />

      {/* Event summary card */}
      <div className="relative z-10 mx-5 overflow-hidden rounded-2xl border border-border bg-card">
        {p.imageUrl && (
          <div className="relative h-36 w-full">
            <Image src={p.imageUrl} alt={p.title} fill className="object-cover" unoptimized />
          </div>
        )}
        <div className="px-4 py-3.5">
          <h2 className="text-lg font-bold text-foreground">{p.title}</h2>
          <div className="mt-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(p.startTime, p.endTime)}
            </span>
            {p.location && (
              <span className="flex items-center gap-2">
                {online ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                <span className="line-clamp-1">{p.location}</span>
              </span>
            )}
            <span className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              {activeRsvps.length} registered
              {p.maxCapacity > 0 && ` / ${p.maxCapacity} max`}
            </span>
          </div>
        </div>
      </div>

      {/* Draft banner + publish */}
      {isDraft && (
        <div className="relative z-10 mx-5 mt-4 flex items-center justify-between rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-800">Draft</p>
            <p className="text-xs text-zinc-500">Not visible to attendees yet</p>
          </div>
          <Button
            onClick={handlePublish}
            disabled={publishing}
            size="sm"
            className="rounded-xl"
          >
            {publishing ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Publishing...</>
            ) : (
              "Publish"
            )}
          </Button>
        </div>
      )}

      {/* Tab bar */}
      <div className="relative z-10 mt-4 flex border-b border-border/60">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 pb-3 pt-2 text-center text-[13px] font-semibold transition-colors ${
              tab === t.key ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <div className="mx-auto mt-2 h-[2px] w-10 rounded-full bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="relative z-10 flex-1 px-5 pt-4 pb-10">
        {tab === "registrations" && (
          <RegistrationsTab
            rsvps={activeRsvps}
            approvals={approvals}
            checkins={checkins}
            needsApproval={needsApproval}
            approvingWallet={approvingWallet}
            onApprove={handleApprove}
            onBatchApprove={handleBatchApprove}
            batchProgress={batchProgress}
          />
        )}
        {tab === "checkin" && (
          <CheckinTab
            eventId={id}
            rsvps={activeRsvps}
            approvals={approvals}
            checkins={checkins}
            needsApproval={needsApproval}
            onReload={reload}
          />
        )}
        {tab === "email" && (
          <EmailTab
            checkins={checkins}
            rsvps={activeRsvps}
            eventTitle={p.title}
            eventId={id}
          />
        )}
        {tab === "poap" && (
          <PoapTab
            checkins={checkins}
            eventId={id}
            eventTitle={p.title}
          />
        )}
      </div>
    </div>
  )
}
