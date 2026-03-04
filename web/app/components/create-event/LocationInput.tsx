"use client"

import { MapPin, Video } from "lucide-react"

interface LocationInputProps {
  value: string
  onChange: (val: string) => void
}

const ONLINE_PATTERNS = [
  "zoom.us",
  "meet.google.com",
  "teams.microsoft.com",
  "discord.gg",
  "whereby.com",
  "around.co",
]

function isOnlineLocation(location: string): boolean {
  const lower = location.toLowerCase()
  return ONLINE_PATTERNS.some((pattern) => lower.includes(pattern))
}

export function LocationInput({ value, onChange }: LocationInputProps) {
  const online = value.trim() ? isOnlineLocation(value) : null

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          {online ? (
            <Video className="h-4 w-4 text-primary" />
          ) : (
            <MapPin className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Location
            </span>
            {online !== null && (
              <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {online ? "Online" : "In Person"}
              </span>
            )}
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Add location or paste meeting link..."
            className="h-8 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
        </div>
      </div>
    </div>
  )
}
