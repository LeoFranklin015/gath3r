"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { CalendarDays, Check, Copy, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlobAvatar } from "@/app/components/BlobAvatar";
import { useProfile } from "@/app/hooks/useProfile";

export function UserButton() {
  const { logout, user } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const email = user?.email?.address ?? user?.phone?.number ?? "";
  const address = embeddedWallet?.address ?? "";

  const { profile } = useProfile();
  const avatarUrl = profile?.payload?.avatar || undefined;

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
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Open user menu"
        aria-expanded={open}
      >
        <BlobAvatar
          seed={address || user?.id || email}
          imageUrl={avatarUrl}
          size={36}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-10 w-64 rounded-2xl border bg-popover p-4 shadow-lg"
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

          <div className="mt-3 flex flex-col gap-1 border-t pt-3">
            <Button
              variant="ghost"
              role="menuitem"
              onClick={() => { router.push("/profile"); setOpen(false); }}
              className="w-full justify-start text-xs"
            >
              <User className="mr-2 h-3.5 w-3.5" />
              View profile
            </Button>
            <Button
              variant="ghost"
              role="menuitem"
              onClick={() => { router.push("/events/hosted"); setOpen(false); }}
              className="w-full justify-start text-xs"
            >
              <CalendarDays className="mr-2 h-3.5 w-3.5" />
              My Events
            </Button>
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
