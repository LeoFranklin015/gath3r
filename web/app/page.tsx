"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { SplashScreen } from "@/app/components/SplashScreen";

export default function SplashPage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    const hasOnboarded = localStorage.getItem(`gath3r:onboarded:${user.id}`);
    router.replace(hasOnboarded ? "/home" : "/onboarding");
  }, [ready, authenticated, user, router]);

  // Show spinner while Privy loads or while redirecting an existing session
  if (!ready || authenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  return <SplashScreen />;
}
