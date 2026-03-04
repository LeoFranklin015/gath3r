"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { ArrowLeft, Tag, Building2, Loader2, AlignLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EventImageUpload } from "@/app/components/create-event/EventImageUpload"
import { DateTimeSection } from "@/app/components/create-event/DateTimeSection"
import { LocationInput } from "@/app/components/create-event/LocationInput"
import { OptionsSection } from "@/app/components/create-event/OptionsSection"
import { useCreateEvent } from "@/app/hooks/useCreateEvent"

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(s: string): number {
  return Math.floor(new Date(s).getTime() / 1000)
}

function defaultTimes() {
  const start = new Date(Date.now() + 60 * 60 * 1000)
  const end = new Date(Date.now() + 2 * 60 * 60 * 1000)
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) }
}

export default function CreateEventPage() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()
  const { submit, loading } = useCreateEvent()
  const [submittingAs, setSubmittingAs] = useState<"draft" | "published" | null>(null)

  const defaults = defaultTimes()

  const [imageUrl, setImageUrl] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [showDescription, setShowDescription] = useState(false)
  const [startTime, setStartTime] = useState(defaults.start)
  const [endTime, setEndTime] = useState(defaults.end)
  const [location, setLocation] = useState("")
  const [tags, setTags] = useState("")
  const [city, setCity] = useState("")
  const [ticketPrice, setTicketPrice] = useState(0)
  const [requiresApproval, setRequiresApproval] = useState(true)
  const [maxCapacity, setMaxCapacity] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ready && !authenticated) router.replace("/")
  }, [ready, authenticated, router])

  const handleSubmit = async (status: "draft" | "published") => {
    setError(null)

    if (!title.trim()) { setError("Event name is required."); return }
    if (!city.trim()) { setError("City is required for indexing."); return }

    const start = fromDatetimeLocal(startTime)
    const end = fromDatetimeLocal(endTime)

    if (!startTime || !endTime) { setError("Start and end times are required."); return }
    if (end <= start) { setError("End time must be after start time."); return }

    setSubmittingAs(status)
    try {
      await submit({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        city: city.trim(),
        startTime: start,
        endTime: end,
        maxCapacity,
        requiresApproval: ticketPrice > 0 ? false : requiresApproval,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        imageUrl,
        ticketPrice,
      }, status)
      router.push("/home")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmittingAs(null)
    }
  }

  if (!ready || !authenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {/* Warm gradient wash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.96 0.03 60) 0%, oklch(0.99 0.003 85) 100%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-3 px-5 pt-6 pb-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm transition-colors hover:bg-background/80"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <h1 className="text-[15px] font-semibold text-foreground">New Event</h1>
      </header>

      {/* Scrollable form */}
      <div className="relative z-10 flex flex-1 flex-col px-5 pt-2 pb-10">
        {/* Hero image */}
        <EventImageUpload imageUrl={imageUrl} onImageUploaded={setImageUrl} />

        {/* Event name — big, bold, borderless */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event Name"
          className="mt-5 w-full bg-transparent text-[22px] font-bold leading-tight text-foreground placeholder:text-muted-foreground/40 outline-none"
        />

        {/* Thin separator */}
        <div className="my-5 h-px bg-border/60" />

        {/* Grouped fields — cards flow vertically with consistent spacing */}
        <div className="flex flex-col gap-3">
          {/* Date/Time */}
          <DateTimeSection
            startTime={startTime}
            endTime={endTime}
            onStartChange={setStartTime}
            onEndChange={setEndTime}
          />

          {/* Location */}
          <LocationInput value={location} onChange={setLocation} />

          {/* Description */}
          {showDescription ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <AlignLeft className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Description
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell people what your event is about..."
                rows={3}
                autoFocus
                className="w-full resize-none bg-transparent px-4 pb-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDescription(true)}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-3.5 text-left transition-colors hover:border-primary/30 hover:bg-card"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                <AlignLeft className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Add description</span>
            </button>
          )}

          {/* Tags */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Tag className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Tags
                </span>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="web3, meetup, dev"
                  className="h-8 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                />
              </div>
            </div>
          </div>

          {/* City */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    City
                  </span>
                  <span className="text-[10px] text-destructive">*</span>
                </div>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. San Francisco"
                  className="h-8 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Thin separator before options */}
        <div className="my-5 h-px bg-border/60" />

        {/* Options */}
        <OptionsSection
          ticketPrice={ticketPrice}
          requiresApproval={requiresApproval}
          maxCapacity={maxCapacity}
          onTicketPriceChange={(val) => {
            setTicketPrice(val)
            if (val > 0) setRequiresApproval(false)
          }}
          onRequiresApprovalChange={setRequiresApproval}
          onMaxCapacityChange={setMaxCapacity}
        />

        {/* Error */}
        {error && (
          <p className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => handleSubmit("draft")}
            disabled={loading}
            variant="outline"
            size="lg"
            className="flex-1 rounded-2xl py-6 text-base font-semibold"
          >
            {submittingAs === "draft" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Draft"
            )}
          </Button>
          <Button
            onClick={() => handleSubmit("published")}
            disabled={loading}
            size="lg"
            className="flex-2 rounded-2xl py-6 text-base font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25"
          >
            {submittingAs === "published" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish Event"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
