"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { AppHeader } from "@/app/components/AppHeader"
import { useMyEvents } from "@/app/hooks/useMyEvents"
import { useEvents } from "@/app/hooks/useEvents"
import { EventCard } from "@/app/components/EventCard"
import {
  DiscoverFilters,
  type TimeFilter,
  type PriceFilter,
  type AccessFilter,
} from "@/app/components/DiscoverFilters"
import { Plus, Compass, CalendarCheck } from "lucide-react"
import type { EventPayload, ArkivEntity } from "@/lib/arkiv/types"

type Tab = "discover" | "attending"

interface DateGroup {
  label: { primary: string; secondary: string }
  events: ArkivEntity<EventPayload>[]
}

function getDateLabel(timestamp: number): {
  primary: string
  secondary: string
  key: string
} {
  const ts = timestamp && isFinite(timestamp) ? timestamp : Math.floor(Date.now() / 1000)
  const date = new Date(ts * 1000)
  if (isNaN(date.getTime())) {
    return { primary: "Unknown", secondary: "", key: "unknown" }
  }
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

function getTimeBounds(filter: TimeFilter): {
  startTimeGte?: number
  startTimeLte?: number
} {
  if (filter === "all") return {}
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  if (filter === "today") {
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)
    return {
      startTimeGte: Math.floor(startOfDay.getTime() / 1000),
      startTimeLte: Math.floor(endOfDay.getTime() / 1000),
    }
  }
  if (filter === "this-week") {
    const endOfWeek = new Date(now)
    endOfWeek.setDate(endOfWeek.getDate() + 7)
    endOfWeek.setHours(23, 59, 59, 999)
    return {
      startTimeGte: Math.floor(now.getTime() / 1000),
      startTimeLte: Math.floor(endOfWeek.getTime() / 1000),
    }
  }
  // this-month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return {
    startTimeGte: Math.floor(now.getTime() / 1000),
    startTimeLte: Math.floor(endOfMonth.getTime() / 1000),
  }
}

export default function HomePage() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()
  const { going, pending, drafts, statusMap, loading: myLoading } = useMyEvents()

  // Filter state
  const [cityFilter, setCityFilter] = useState<string | undefined>(undefined)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all")
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all")
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all")

  const timeBounds = useMemo(() => getTimeBounds(timeFilter), [timeFilter])

  const { events: publicEvents, loading: discoverLoading } = useEvents({
    city: cityFilter,
    ...timeBounds,
  })

  const [tab, setTab] = useState<Tab>("discover")

  useEffect(() => {
    if (ready && !authenticated) router.replace("/")
  }, [ready, authenticated, router])

  // Merge going + pending + drafts, sorted by startTime
  const allMyEvents = useMemo(() => {
    const merged = [...going, ...pending, ...drafts]
    return merged.sort((a, b) => a.payload.startTime - b.payload.startTime)
  }, [going, pending, drafts])

  // Derive available cities & tags from fetched events
  const availableCities = useMemo(() => {
    const cities = new Set<string>()
    for (const e of publicEvents) {
      if (e.payload.city) cities.add(e.payload.city)
    }
    return Array.from(cities).sort()
  }, [publicEvents])

  // Client-side filtering (price, access) + sort
  const filteredDiscover = useMemo(() => {
    let filtered = publicEvents

    if (priceFilter === "free") {
      filtered = filtered.filter((e) => !e.payload.ticketPrice || e.payload.ticketPrice === 0)
    } else if (priceFilter === "paid") {
      filtered = filtered.filter((e) => e.payload.ticketPrice > 0)
    }

    if (accessFilter === "open") {
      filtered = filtered.filter((e) => !e.payload.requiresApproval)
    } else if (accessFilter === "invite-only") {
      filtered = filtered.filter((e) => e.payload.requiresApproval)
    }

    return [...filtered].sort((a, b) => a.payload.startTime - b.payload.startTime)
  }, [publicEvents, priceFilter, accessFilter])

  const activeEvents = tab === "discover" ? filteredDiscover : allMyEvents
  const isLoading = tab === "discover" ? discoverLoading : myLoading
  type TabIcon = typeof Compass
  const tabConfig: { key: Tab; label: string; icon: TabIcon }[] = [
    { key: "discover", label: "Discover", icon: Compass },
    { key: "attending", label: "Attending", icon: CalendarCheck },
  ]
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
      <AppHeader />

      {/* Tabs — full-width with underline */}
      <div className="flex border-b border-border/60">
        {tabConfig.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 pb-3 pt-2 text-center text-[15px] font-semibold transition-colors ${
                tab === t.key ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className="h-4 w-4" />
                {t.label}
              </span>
              {tab === t.key && (
                <div className="mx-auto mt-2 h-[2px] w-14 rounded-full bg-foreground" />
              )}
            </button>
          )
        })}
      </div>

      {/* Filters — Discover tab only */}
      {tab === "discover" && (
        <DiscoverFilters
          availableCities={availableCities}
          cityFilter={cityFilter}
          timeFilter={timeFilter}
          priceFilter={priceFilter}
          accessFilter={accessFilter}
          onCityChange={setCityFilter}
          onTimeChange={setTimeFilter}
          onPriceChange={setPriceFilter}
          onAccessChange={setAccessFilter}
        />
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {isLoading ? (
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
        <span className="text-2xl">
          {tab === "discover" ? "🔍" : "📅"}
        </span>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {tab === "discover" ? "No events found" : "No events yet"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {tab === "discover"
            ? "Check back later for new events"
            : "Events you RSVP to will show here"}
        </p>
      </div>
    </div>
  )
}
