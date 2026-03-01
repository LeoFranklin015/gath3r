"use client";

import { usePrivy } from "@privy-io/react-auth";
import { UserButton } from "@/app/components/UserButton";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex flex-col items-center gap-6 p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Duma
        </h1>

        {authenticated ? (
          <UserButton />
        ) : (
          <Button onClick={login} className="rounded-full px-5">
            Connect
          </Button>
        )}
      </main>
    </div>
  );
}
