"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OnboardingPage() {
  const { ready, authenticated, user, logout } = usePrivy();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Guard: not logged in → splash
  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  // Guard: already onboarded → home
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    if (localStorage.getItem(`gather:onboarded:${user.id}`)) {
      router.replace("/home");
    }
  }, [ready, authenticated, user, router]);

  const handleContinue = async () => {
    if (!name.trim() || !user) return;
    setLoading(true);
    // TODO: persist profile to Arkiv chain
    localStorage.setItem(`gather:onboarded:${user.id}`, "true");
    localStorage.setItem(`gather:name:${user.id}`, name.trim());
    router.replace("/home");
  };

  if (!ready || !authenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col items-center justify-between bg-zinc-950 px-6 py-14">
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
          <span className="text-sm font-black text-zinc-950">G</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="gap-1.5 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
      </div>

      {/* Content */}
      <div className="flex w-full flex-col items-center gap-8">
        {/* Avatar preview */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-4xl">
          {name.trim() ? (
            <span className="text-3xl font-bold text-white">
              {name.trim().charAt(0).toUpperCase()}
            </span>
          ) : (
            <span className="text-3xl">👤</span>
          )}
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-white">What's your name?</h1>
          <p className="text-sm text-zinc-400">This is how you'll appear on events.</p>
        </div>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleContinue()}
          placeholder="Your name"
          autoFocus
          className="w-full rounded-2xl border-zinc-700 bg-zinc-900 py-6 text-center text-lg text-white placeholder:text-zinc-600 focus-visible:ring-zinc-500"
        />
      </div>

      {/* CTA */}
      <Button
        onClick={handleContinue}
        disabled={!name.trim() || loading}
        size="lg"
        className="w-full rounded-2xl bg-white py-6 text-base font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-30"
      >
        {loading ? "Setting up…" : "Continue"}
      </Button>
    </div>
  );
}
