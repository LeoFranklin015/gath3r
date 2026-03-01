"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { UserButton } from "@/app/components/UserButton";

export default function HomePage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

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
        <span className="text-lg font-bold text-white">Gather</span>
        <UserButton />
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
        <p className="text-2xl">🎉</p>
        <p className="text-sm text-zinc-500">Your events will appear here.</p>
      </main>
    </div>
  );
}
