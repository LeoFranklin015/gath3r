"use client"

import { useState, useEffect, useCallback } from "react"
import { Send, Loader2, Check, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ENSName } from "@/app/components/ENSName"
import type { RsvpEntity, CheckinEntity } from "@/lib/arkiv/types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/backend"

function welcomeEmailHtml(eventTitle: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <div style="background:linear-gradient(135deg,#fff7ed,#fff);border-radius:16px;border:1px solid #fed7aa;padding:32px 24px;text-align:center">
      <div style="width:48px;height:48px;background:#f97316;border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
        <span style="color:white;font-size:24px">🎉</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1c1917">Thanks for attending!</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#78716c">You checked in to <strong>${eventTitle}</strong></p>
      <div style="height:1px;background:#fed7aa;margin:20px 0"></div>
      <p style="margin:0;font-size:12px;color:#a8a29e">Sent via Gath3r</p>
    </div>
  </div>
</body>
</html>`
}

interface Member {
  wallet: string
  email: string | null
}

interface EmailTabProps {
  checkins: CheckinEntity[]
  rsvps: RsvpEntity[]
  eventTitle: string
  eventId: string
}

export function EmailTab({ checkins, rsvps, eventTitle }: EmailTabProps) {
  const [mode, setMode] = useState<"welcome" | "custom">("welcome")
  const [recipients, setRecipients] = useState("")
  const [subject, setSubject] = useState("")
  const [html, setHtml] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // Member email resolution
  const [members, setMembers] = useState<Member[]>([])
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Resolve wallet → email via Next.js API route
  const resolveEmails = useCallback(async () => {
    const wallets = checkins.map((c) => c.attendeeWallet)
    if (wallets.length === 0) {
      setMembers([])
      return
    }
    setLoadingEmails(true)
    try {
      const res = await fetch("/api/privy/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallets }),
      })
      const data = await res.json()
      const emailMap: Record<string, string | null> = data.emails || {}
      setMembers(
        wallets.map((w) => ({
          wallet: w,
          email: emailMap[w.toLowerCase()] ?? null,
        })),
      )
    } catch {
      // Fallback: show wallets without emails
      setMembers(wallets.map((w) => ({ wallet: w, email: null })))
    } finally {
      setLoadingEmails(false)
    }
  }, [checkins])

  useEffect(() => {
    resolveEmails()
  }, [resolveEmails])

  const toggleMember = (wallet: string) => {
    const member = members.find((m) => m.wallet === wallet)
    if (!member?.email) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(wallet)) {
        next.delete(wallet)
        // Remove email from recipients
        setRecipients((r) => {
          const emails = r.split(",").map((e) => e.trim()).filter(Boolean)
          return emails.filter((e) => e !== member.email).join(", ")
        })
      } else {
        next.add(wallet)
        // Add email to recipients
        setRecipients((r) => {
          const emails = r.split(",").map((e) => e.trim()).filter(Boolean)
          if (!emails.includes(member.email!)) emails.push(member.email!)
          return emails.join(", ")
        })
      }
      return next
    })
  }

  const selectableMembers = members.filter((m) => m.email)

  const toggleAll = () => {
    if (selected.size === selectableMembers.length) {
      setSelected(new Set())
      setRecipients("")
    } else {
      const allWallets = new Set(selectableMembers.map((m) => m.wallet))
      setSelected(allWallets)
      setRecipients(selectableMembers.map((m) => m.email!).join(", "))
    }
  }

  const sendEmail = async (to: string[], subj: string, body: string) => {
    setSending(true)
    setResult(null)
    try {
      const res = await fetch(`${BACKEND_URL}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject: subj, html: body }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult({ ok: true, msg: `Email sent to ${to.length} recipient(s)` })
      } else {
        setResult({ ok: false, msg: data.error || "Failed to send" })
      }
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : "Network error" })
    } finally {
      setSending(false)
    }
  }

  const getRecipientList = () =>
    recipients.split(",").map((e) => e.trim()).filter(Boolean)

  const handleWelcome = () => {
    const emails = getRecipientList()
    if (emails.length === 0) {
      setResult({ ok: false, msg: "Select at least one recipient" })
      return
    }
    sendEmail(emails, `Thanks for attending ${eventTitle}!`, welcomeEmailHtml(eventTitle))
  }

  const handleCustom = () => {
    const emails = getRecipientList()
    if (emails.length === 0) {
      setResult({ ok: false, msg: "Select at least one recipient" })
      return
    }
    if (!subject.trim()) {
      setResult({ ok: false, msg: "Subject is required" })
      return
    }
    if (!html.trim()) {
      setResult({ ok: false, msg: "Message body is required" })
      return
    }
    sendEmail(emails, subject, html)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
        <p className="text-sm font-medium text-foreground">
          {checkins.length} checked-in participants
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {rsvps.length} total registered
        </p>
      </div>

      {/* Selectable member list */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            Select Recipients
          </p>
          {selectableMembers.length > 0 && (
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-[11px] font-medium text-primary"
            >
              <div
                className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                  selected.size === selectableMembers.length
                    ? "border-primary bg-primary text-white"
                    : "border-border"
                }`}
              >
                {selected.size === selectableMembers.length && <Check className="h-2 w-2" />}
              </div>
              All
            </button>
          )}
        </div>

        {loadingEmails ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            No checked-in attendees yet
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            {members.map((m, i) => {
              const isSelected = selected.has(m.wallet)
              const hasEmail = !!m.email
              return (
                <button
                  key={m.wallet}
                  onClick={() => toggleMember(m.wallet)}
                  disabled={!hasEmail}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    hasEmail ? "hover:bg-muted/30" : "opacity-50"
                  } ${i < members.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-border"
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-foreground">
                      {m.email || "No email"}
                    </span>
                    <ENSName address={m.wallet} className="block font-mono text-[10px] text-muted-foreground" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Recipients preview */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          Recipients
        </p>
        <textarea
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          placeholder="Select members above or type emails manually"
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
        />
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 rounded-xl bg-muted/60 p-1">
        <button
          onClick={() => setMode("welcome")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
            mode === "welcome"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Welcome Email
        </button>
        <button
          onClick={() => setMode("custom")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
            mode === "custom"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Custom Message
        </button>
      </div>

      {mode === "welcome" ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Welcome template</p>
              <p className="text-[10px] text-muted-foreground">
                &quot;Thanks for attending {eventTitle}!&quot;
              </p>
            </div>
          </div>
          <Button onClick={handleWelcome} disabled={sending} className="w-full rounded-xl">
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Send Welcome Email</>
            )}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="HTML message body..."
            rows={5}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <Button onClick={handleCustom} disabled={sending} className="w-full rounded-xl">
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Send Custom Email</>
            )}
          </Button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-destructive/20 bg-destructive/5 text-destructive"
          }`}
        >
          {result.ok && <Check className="mr-1 inline h-3 w-3" />}
          {result.msg}
        </div>
      )}
    </div>
  )
}
