"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { UserButton } from "@/app/components/UserButton";
import { useEvents } from "@/app/hooks/useEvents";
import { EventCard } from "@/app/components/EventCard";

export default function HomePage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const { events, loading: eventsLoading } = useEvents();

  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <span className="text-lg font-bold text-white">Gath3r</span>
        <UserButton />
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {eventsLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-2xl">🎉</p>
            <p className="text-sm text-zinc-500">No upcoming events yet.</p>
          </div>
        ) : (
          events.map(event => (
            <EventCard
              key={event.entityKey}
              event={event}
              onClick={() => router.push(`/events/${event.entityKey}`)}
            />
          ))
        )}
      </main>
    </div>
  );
}
