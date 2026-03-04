import Image from "next/image"
import { MapPin, Video, Clock } from "lucide-react"
import type { EventPayload, ArkivEntity } from "@/lib/arkiv/types"
import type { MyEventStatus } from "@/app/hooks/useMyEvents"

const ONLINE_PATTERNS = [
  "zoom.us",
  "meet.google.com",
  "teams.microsoft.com",
  "discord.gg",
  "whereby.com",
  "around.co",
]

function isOnline(location: string) {
  return ONLINE_PATTERNS.some((p) => location.toLowerCase().includes(p))
}

function short(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

interface EventCardProps {
  event: ArkivEntity<EventPayload>
  status?: MyEventStatus
  onClick?: () => void
}

export function EventCard({ event, status, onClick }: EventCardProps) {
  const { payload: p } = event
  const start = new Date(p.startTime * 1000)
  const time = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  const online = p.location ? isOnline(p.location) : false
  const locationLabel = online
    ? p.location.includes("zoom") ? "Zoom" : "Online"
    : p.location

  const isPending = status === "pending"

  return (
    <button
      onClick={onClick}
      className={`w-full text-left transition-opacity active:opacity-70 ${isPending ? "opacity-55" : ""}`}
    >
      <div className="flex gap-3 py-3">
        {/* Thumbnail — left */}
        <div className="relative h-[80px] w-[80px] shrink-0 overflow-hidden rounded-xl bg-muted/40">
          {p.imageUrl ? (
            <Image
              src={p.imageUrl}
              alt={p.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <span className="text-xl opacity-40">📅</span>
            </div>
          )}
          {status && (
            <span
              className={`absolute bottom-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                status === "going"
                  ? "bg-green-500 text-white"
                  : "bg-amber-400 text-amber-900"
              }`}
            >
              {status === "going" ? "Going" : "Pending"}
            </span>
          )}
        </div>

        {/* Content — right */}
        <div className="flex flex-1 min-w-0 flex-col justify-center">
          {/* Title */}
          <h3 className="text-[15px] font-bold leading-snug text-foreground line-clamp-2">
            {p.title}
          </h3>

          {/* Host */}
          <p className="mt-1 text-xs text-muted-foreground truncate">
            By {short(event.owner)}
          </p>

          {/* Time + Location row */}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {time}
            </span>
            {p.location && (
              <span className="flex items-center gap-1 truncate">
                {online ? (
                  <Video className="h-3 w-3 shrink-0" />
                ) : (
                  <MapPin className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">{locationLabel}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
