"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { ArrowLeft, Plus } from "lucide-react"
import { EventCard } from "@/app/components/EventCard"
import { useHostedEvents } from "@/app/hooks/useHostedEvents"

export default function HostedEventsPage() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()
  const { events, loading, error } = useHostedEvents()

  useEffect(() => {
    if (ready && !authenticated) router.replace("/")
  }, [ready, authenticated, router])

  if (!ready || !authenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {/* Warm gradient wash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.96 0.03 60) 0%, oklch(0.99 0.003 85) 100%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-3 px-5 pt-6 pb-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm transition-colors hover:bg-background/80"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <h1 className="text-[15px] font-semibold text-foreground">My Events</h1>
      </header>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col px-5 pt-2 pb-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : error ? (
          <p className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
            {error}
          </p>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No events yet</p>
            <button
              onClick={() => router.push("/events/create")}
              className="mt-1 text-sm font-medium text-primary hover:underline"
            >
              Create your first event
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(event => (
              <EventCard
                key={event.entityKey}
                event={event}
                status={event.status === "draft" ? "draft" : undefined}
                onClick={() => router.push(`/events/hosted/${event.entityKey}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
