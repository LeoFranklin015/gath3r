"use client"

import { Clock } from "lucide-react"

interface DateTimeSectionProps {
  startTime: string
  endTime: string
  onStartChange: (val: string) => void
  onEndChange: (val: string) => void
}

function formatPreview(dtLocal: string): string {
  if (!dtLocal) return ""
  const d = new Date(dtLocal)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }) + ", " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function DateTimeSection({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: DateTimeSectionProps) {
  const startPreview = formatPreview(startTime)
  const endPreview = formatPreview(endTime)

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {/* Start */}
      <div className="flex items-center gap-3 bg-card px-4 py-3.5">
        <div className="flex flex-col items-center">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="mt-1 h-5 border-l-[1.5px] border-dashed border-primary/30" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Starts
            </span>
          </div>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => onStartChange(e.target.value)}
            className="h-9 w-full bg-transparent text-sm font-medium text-foreground outline-none"
          />
          {startPreview && (
            <span className="text-xs text-muted-foreground">{startPreview}</span>
          )}
        </div>
      </div>

      <div className="ml-[1.3rem] h-px bg-border" />

      {/* End */}
      <div className="flex items-center gap-3 bg-card px-4 py-3.5">
        <div className="flex flex-col items-center">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Ends
          </span>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => onEndChange(e.target.value)}
            className="h-9 w-full bg-transparent text-sm font-medium text-foreground outline-none"
          />
          {endPreview && (
            <span className="text-xs text-muted-foreground">{endPreview}</span>
          )}
        </div>
      </div>
    </div>
  )
}
