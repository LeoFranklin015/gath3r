"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { UserButton } from "@/app/components/UserButton"
import { useMyEvents } from "@/app/hooks/useMyEvents"
import { EventCard } from "@/app/components/EventCard"
import { Plus } from "lucide-react"
import type { EventPayload, ArkivEntity } from "@/lib/arkiv/types"

type Tab = "going" | "pending"

interface DateGroup {
  label: { primary: string; secondary: string }
  events: ArkivEntity<EventPayload>[]
}

function getDateLabel(timestamp: number): {
  primary: string
  secondary: string
  key: string
} {
  const date = new Date(timestamp * 1000)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const eventDay = new Date(date)
  eventDay.setHours(0, 0, 0, 0)

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" })
  const key = eventDay.toISOString().split("T")[0]

  if (eventDay.getTime() === today.getTime()) {
    return { primary: "Today", secondary: dayName, key }
  }
  if (eventDay.getTime() === tomorrow.getTime()) {
    return { primary: "Tomorrow", secondary: dayName, key }
  }

  return {
    primary: date.toLocaleDateString("en-US", { day: "numeric", month: "long" }),
    secondary: dayName,
    key,
  }
}

function groupByDate(events: ArkivEntity<EventPayload>[]): DateGroup[] {
  const groups: DateGroup[] = []
  const map = new Map<string, number>()

  for (const event of events) {
    const { primary, secondary, key } = getDateLabel(event.payload.startTime)
    if (map.has(key)) {
      groups[map.get(key)!].events.push(event)
    } else {
      map.set(key, groups.length)
      groups.push({ label: { primary, secondary }, events: [event] })
    }
  }

  return groups
}

export default function HomePage() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()
  const { going, pending, statusMap, loading } = useMyEvents()
  const [tab, setTab] = useState<Tab>("going")

  useEffect(() => {
    if (ready && !authenticated) router.replace("/")
  }, [ready, authenticated, router])

  const sortedGoing = useMemo(
    () => [...going].sort((a, b) => a.payload.startTime - b.payload.startTime),
    [going],
  )
  const sortedPending = useMemo(
    () => [...pending].sort((a, b) => a.payload.startTime - b.payload.startTime),
    [pending],
  )

  const activeEvents = tab === "going" ? sortedGoing : sortedPending
  const dateGroups = useMemo(() => groupByDate(activeEvents), [activeEvents])

  if (!ready || !authenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pt-10 pb-2">
        <span className="text-lg font-bold text-foreground">Gath3r</span>
        <UserButton />
      </header>

      {/* Tabs — full-width with underline */}
      <div className="flex border-b border-border/60">
        <button
          onClick={() => setTab("going")}
          className={`flex-1 pb-3 pt-2 text-center text-[15px] font-semibold transition-colors ${
            tab === "going"
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          Going
          {tab === "going" && (
            <div className="mx-auto mt-2 h-[2px] w-14 rounded-full bg-foreground" />
          )}
        </button>
        <button
          onClick={() => setTab("pending")}
          className={`flex-1 pb-3 pt-2 text-center text-[15px] font-semibold transition-colors ${
            tab === "pending"
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          Pending
          {tab === "pending" && (
            <div className="mx-auto mt-2 h-[2px] w-16 rounded-full bg-foreground" />
          )}
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : activeEvents.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div>
            {dateGroups.map((group, gi) => (
              <div key={gi}>
                {/* Date header */}
                <div className="px-5 pb-1 pt-5">
                  <span className="text-xl font-bold text-foreground">
                    {group.label.primary}
                  </span>
                  <span className="ml-2 text-xl text-muted-foreground">
                    / {group.label.secondary}
                  </span>
                </div>

                {/* Event list */}
                <div className="px-5">
                  {group.events.map((event, ei) => (
                    <div key={event.entityKey}>
                      <EventCard
                        event={event}
                        status={statusMap.get(event.entityKey)}
                        onClick={() =>
                          router.push(`/events/${event.entityKey}`)
                        }
                      />
                      {ei < group.events.length - 1 && (
                        <div className="h-px bg-border/50" />
                      )}
                    </div>
                  ))}
                </div>

                {gi < dateGroups.length - 1 && (
                  <div className="mx-5 h-px bg-border/50" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => router.push("/events/create")}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
        <span className="text-2xl">{tab === "going" ? "📅" : "📋"}</span>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {tab === "going" ? "No events yet" : "No pending events"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {tab === "going"
            ? "Events you RSVP to will show here"
            : "Pending events will appear here"}
        </p>
      </div>
    </div>
  )
}
