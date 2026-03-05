"use client"

import { useState } from "react"
import { X, Send, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { EventPayload } from "@/lib/arkiv/types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/backend"

function formatDate(start: number, end: number) {
  const s = new Date(start * 1000)
  const e = new Date(end * 1000)
  const date = s.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const t1 = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  const t2 = e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  return `${date} · ${t1} – ${t2}`
}

function inviteEmailHtml(event: EventPayload, eventUrl: string): string {
  const dateStr = formatDate(event.startTime, event.endTime)
  const locationHtml = event.location
    ? `<tr><td style="padding:8px 0;vertical-align:top"><span style="color:#78716c;font-size:13px">Where</span></td><td style="padding:8px 0 8px 16px;font-size:14px;color:#1c1917">${event.location}</td></tr>`
    : ""
  const descHtml = event.description
    ? `<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#44403c">${event.description}</p>`
    : ""
  const tagsHtml =
    event.tags.length > 0
      ? `<p style="margin:16px 0 0">${event.tags.map((t) => `<span style="display:inline-block;background:#fff7ed;border:1px solid #fed7aa;border-radius:20px;padding:3px 10px;font-size:11px;color:#9a3412;margin:0 4px 4px 0">${t}</span>`).join("")}</p>`
      : ""

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <div style="background:#fff;border-radius:16px;border:1px solid #e7e5e4;overflow:hidden">
      ${event.imageUrl ? `<img src="${event.imageUrl}" alt="${event.title}" style="width:100%;height:200px;object-fit:cover;display:block" />` : ""}
      <div style="padding:24px">
        <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1c1917">You're Invited!</h1>
        <p style="margin:0 0 20px;font-size:14px;color:#78716c">You've been invited to an exclusive event</p>

        <div style="background:#faf9f7;border-radius:12px;padding:16px;margin-bottom:16px">
          <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#1c1917">${event.title}</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr>
              <td style="padding:8px 0;vertical-align:top"><span style="color:#78716c;font-size:13px">When</span></td>
              <td style="padding:8px 0 8px 16px;font-size:14px;color:#1c1917">${dateStr}</td>
            </tr>
            ${locationHtml}
            ${event.ticketPrice > 0 ? `<tr><td style="padding:8px 0;vertical-align:top"><span style="color:#78716c;font-size:13px">Price</span></td><td style="padding:8px 0 8px 16px;font-size:14px;color:#1c1917">${event.ticketPrice} ETH</td></tr>` : ""}
            ${event.maxCapacity > 0 ? `<tr><td style="padding:8px 0;vertical-align:top"><span style="color:#78716c;font-size:13px">Capacity</span></td><td style="padding:8px 0 8px 16px;font-size:14px;color:#1c1917">${event.maxCapacity} spots</td></tr>` : ""}
          </table>
        </div>

        ${descHtml}
        ${tagsHtml}

        <div style="margin:24px 0 0;text-align:center">
          <a href="${eventUrl}" style="display:inline-block;background:#f97316;color:white;text-decoration:none;padding:12px 32px;border-radius:12px;font-size:15px;font-weight:600">View Event & RSVP</a>
        </div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #e7e5e4;text-align:center">
        <p style="margin:0;font-size:11px;color:#a8a29e">Sent via Gath3r</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

interface InviteModalProps {
  event: EventPayload
  eventEntityKey: string
  onClose: () => void
}

export function InviteModal({ event, eventEntityKey, onClose }: InviteModalProps) {
  const [emailsCsv, setEmailsCsv] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const getEmails = () =>
    emailsCsv
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"))

  const handleSend = async () => {
    const emails = getEmails()
    if (emails.length === 0) {
      setResult({ ok: false, msg: "Enter at least one email address" })
      return
    }

    setSending(true)
    setResult(null)

    const eventUrl = `${window.location.origin}/events/${eventEntityKey}`

    try {
      const res = await fetch(`${BACKEND_URL}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emails,
          subject: `You're invited: ${event.title}`,
          html: inviteEmailHtml(event, eventUrl),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult({ ok: true, msg: `Invites sent to ${emails.length} people` })
      } else {
        setResult({ ok: false, msg: data.error || "Failed to send" })
      }
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : "Network error" })
    } finally {
      setSending(false)
    }
  }

  const emailCount = getEmails().length

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-background border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Send Invites</h2>
            <p className="text-xs text-muted-foreground">
              Your event is live! Share it with your guests.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Event preview */}
        <div className="mx-5 rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold text-foreground">{event.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatDate(event.startTime, event.endTime)}
          </p>
          {event.location && (
            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{event.location}</p>
          )}
        </div>

        {/* Email input */}
        <div className="px-5 pt-4">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            Email Addresses
          </label>
          <textarea
            value={emailsCsv}
            onChange={(e) => {
              setEmailsCsv(e.target.value)
              setResult(null)
            }}
            placeholder={"alice@example.com, bob@example.com\nor one per line..."}
            rows={4}
            autoFocus
            className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40"
          />
          {emailCount > 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {emailCount} recipient{emailCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Result */}
        {result && (
          <div
            className={`mx-5 mt-3 rounded-xl border px-3 py-2.5 text-xs ${
              result.ok
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-destructive/20 bg-destructive/5 text-destructive"
            }`}
          >
            {result.ok && <Check className="mr-1 inline h-3 w-3" />}
            {result.msg}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 px-5 pt-4 pb-5">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl"
          >
            {result?.ok ? "Done" : "Skip"}
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || emailCount === 0}
            className="flex-1 rounded-xl"
          >
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Send Invites</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
