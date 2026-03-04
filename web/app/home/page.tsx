"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { UserButton } from "@/app/components/UserButton";
import { useEvents } from "@/app/hooks/useEvents";
import { EventCard } from "@/app/components/EventCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getProfileByWallet, deleteProfile } from "@/lib/arkiv/entities/profile";
import { useArkivWallet } from "@/app/hooks/useArkivWallet";

const TARGET_WALLET = "0x81a0901D3f1aE2edb8FE682bEC8F58F237C37132" as `0x${string}`;

export default function HomePage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const { events, loading: eventsLoading } = useEvents();
  const { getClient } = useArkivWallet();
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  const handleDeleteProfile = async () => {
    setDeleting(true);
    setDeleteStatus(null);
    try {
      const profile = await getProfileByWallet(TARGET_WALLET);
      if (!profile) {
        setDeleteStatus("No profile found — clearing local flags...");
      } else {
        const client = await getClient();
        const txHash = await deleteProfile(client, profile.entityKey);
        setDeleteStatus(`Deleted! tx: ${txHash.slice(0, 10)}...`);
      }
      // Clear localStorage onboarding flags so the user hits onboarding again
      if (user) {
        localStorage.removeItem(`gath3r:onboarded:${user.id}`);
        localStorage.removeItem(`gath3r:name:${user.id}`);
      }
      // Redirect to onboarding
      setTimeout(() => router.replace("/onboarding"), 500);
    } catch (e) {
      setDeleteStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDeleting(false);
    }
  };

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

      {/* Temp: Delete profile button */}
      <div className="px-4 py-3 border-b border-zinc-800/60 space-y-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteProfile}
          disabled={deleting}
          className="w-full"
        >
          {deleting ? "Deleting..." : `Delete profile: ${TARGET_WALLET.slice(0, 6)}...${TARGET_WALLET.slice(-4)}`}
        </Button>
        {deleteStatus && (
          <p className="text-xs text-zinc-400 text-center">{deleteStatus}</p>
        )}
      </div>

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

      {/* FAB — Create Event */}
      <button
        onClick={() => router.push("/events/create")}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
