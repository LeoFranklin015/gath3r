"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Check, Copy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <Button
        variant="default"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        className="h-10 w-10 rounded-full text-sm font-semibold"
        aria-label="Open user menu"
        aria-expanded={open}
      >
        {initial}
      </Button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-12 z-10 w-64 -translate-x-1/2 rounded-2xl border bg-popover p-4 shadow-lg"
        >
          {/* Email */}
          <p className="mb-3 truncate text-xs font-medium text-muted-foreground">
            {email}
          </p>

          {/* Address row */}
          {embeddedWallet && (
            <Button
              variant="secondary"
              onClick={copyAddress}
              role="menuitem"
              className="w-full justify-between rounded-xl font-mono text-xs"
            >
              <span>
                {embeddedWallet.address.slice(0, 6)}...{embeddedWallet.address.slice(-4)}
              </span>
              {copied
                ? <Check className="h-3.5 w-3.5 text-green-500" />
                : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </Button>
          )}

          <div className="mt-3 border-t pt-3">
            <Button
              variant="ghost"
              role="menuitem"
              onClick={() => { logout(); setOpen(false); }}
              className="w-full justify-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
