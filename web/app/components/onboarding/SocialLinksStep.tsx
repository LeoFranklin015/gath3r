"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Globe } from "lucide-react"
import type { StepProps } from "./types"
import type { SocialPlatform, SocialLink } from "@/lib/arkiv/types"

interface PlatformConfig {
  platform: SocialPlatform
  label: string
  placeholder: string
  prefix: string
}

const PLATFORMS: PlatformConfig[] = [
  { platform: "twitter",   label: "X (Twitter)", placeholder: "username",     prefix: "@" },
  { platform: "instagram", label: "Instagram",   placeholder: "username",     prefix: "@" },
  { platform: "github",    label: "GitHub",      placeholder: "username",     prefix: "@" },
  { platform: "website",   label: "Website",     placeholder: "yoursite.com", prefix: "https://" },
]

export function SocialLinksStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const getValue = (platform: SocialPlatform): string =>
    data.socialLinks.find((l) => l.platform === platform)?.url ?? ""

  const updatePlatform = (platform: SocialPlatform, url: string) => {
    const rest = data.socialLinks.filter((l) => l.platform !== platform)
    const updated: SocialLink[] = url.trim()
      ? [...rest, { platform, url: url.trim() }]
      : rest
    onUpdate({ socialLinks: updated })
  }

  const hasAnyLink = data.socialLinks.some((l) => l.url.trim())

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">
          Where can people find you?
        </h1>
        <p className="text-sm text-muted-foreground">
          Add your socials — all optional.
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        {PLATFORMS.map(({ platform, label, placeholder, prefix }) => (
          <div key={platform} className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {label}
            </label>
            <div className="flex items-center overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-center pl-3">
                <PlatformIcon platform={platform} />
              </div>
              <span className="pl-2 text-sm text-muted-foreground">{prefix}</span>
              <Input
                value={getValue(platform)}
                onChange={(e) => updatePlatform(platform, e.target.value)}
                placeholder={placeholder}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex w-full gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          size="lg"
          className="rounded-2xl px-4 py-6"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={onNext}
          size="lg"
          className="flex-1 rounded-2xl py-6 text-base font-semibold"
        >
          {hasAnyLink ? "Finish" : "Skip"}
        </Button>
      </div>
    </div>
  )
}

// ─── Platform icons ───

function PlatformIcon({ platform }: { platform: SocialPlatform }) {
  const cls = "h-4 w-4 text-muted-foreground"

  switch (platform) {
    case "twitter":
      return <XIcon className={cls} />
    case "instagram":
      return <InstagramIcon className={cls} />
    case "github":
      return <GithubIcon className={cls} />
    case "website":
      return <Globe className={cls} />
  }
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}
