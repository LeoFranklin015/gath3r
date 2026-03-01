"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export function UserButton() {
  const { logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const email = user?.email?.address ?? user?.phone?.number ?? "";
  const initial = email.charAt(0).toUpperCase();

  const copyAddress = () => {
    if (!embeddedWallet) return;
    navigator.clipboard.writeText(embeddedWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-80 dark:bg-zinc-50 dark:text-zinc-900"
        aria-label="Open user menu"
        aria-expanded={open}
      >
        {initial}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-12 z-10 w-64 -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          {/* Email */}
          <p className="mb-3 truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {email}
          </p>

          {/* Address row */}
          {embeddedWallet && (
            <button
              onClick={copyAddress}
              role="menuitem"
              className="flex w-full items-center justify-between rounded-xl bg-zinc-100 px-3 py-2 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {embeddedWallet.address.slice(0, 6)}...{embeddedWallet.address.slice(-4)}
              </span>
              {copied ? (
                <CheckIcon className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5 text-zinc-400" />
              )}
            </button>
          )}

          <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <button
              role="menuitem"
              onClick={() => { logout(); setOpen(false); }}
              className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
