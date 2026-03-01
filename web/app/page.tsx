"use client";

import { usePrivy } from "@privy-io/react-auth";
import { UserButton } from "@/app/components/UserButton";

export default function Home() {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Duma
        </h1>

        {authenticated ? (
          <UserButton />
        ) : (
          <button
            onClick={login}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Connect
          </button>
        )}
      </main>
    </div>
  );
}
