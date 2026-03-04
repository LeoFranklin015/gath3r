'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useArkivWallet } from '@/app/hooks/useArkivWallet'
import { useProfile } from '@/app/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { createEvent, publishEvent, listPublishedEvents, getEvent } from '@/lib/arkiv/entities/event'
import { createRsvp, cancelRsvp, listRsvpsForEvent, getRsvpForAttendee } from '@/lib/arkiv/entities/rsvp'
import { createCheckin, getCheckin } from '@/lib/arkiv/entities/checkin'
import { createApproval, listApprovalsForEvent, getApprovalForAttendee } from '@/lib/arkiv/entities/approval'

import type { EventPayload, ArkivEntity, RsvpEntity, ApprovalEntity, CheckinPayload } from '@/lib/arkiv/types'
import { CreateEventModal, type EventFormData } from '@/app/components/CreateEventModal'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

// ── Live state for selected event ────────────────────────────────────────────
interface LiveState {
  event: ArkivEntity<EventPayload> | null
  rsvps: RsvpEntity[]
  approvals: ApprovalEntity[]
  myRsvp: RsvpEntity | null
  myApproval: ApprovalEntity | null
  myCheckin: ArkivEntity<CheckinPayload> | null
  lastRefreshed: number
}

const EMPTY_STATE: LiveState = {
  event: null, rsvps: [], approvals: [], myRsvp: null, myApproval: null, myCheckin: null, lastRefreshed: 0,
}

function short(addr: string) {
  return addr ? `${addr.slice(0, 6)}\u2026${addr.slice(-4)}` : '\u2014'
}
function fmtTime(ts: number) {
  return ts ? new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '\u2014'
}

type LogEntry = { label: string; data: unknown; error?: string }

export default function TestPage() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const { getClient, address, ready: walletReady } = useArkivWallet()
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')

  // ── Profile ───────────────────────────────────────────────────────────────
  const { profile, loading: profileLoading, create: createProfile } = useProfile()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [creatingProfile, setCreatingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const hasProfile = !!profile

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) { setProfileError('Display name is required.'); return }
    setCreatingProfile(true)
    setProfileError(null)
    try {
      await createProfile({ displayName: displayName.trim(), bio: bio.trim(), avatar: '', socialLinks: [] })
      setDisplayName('')
      setBio('')
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreatingProfile(false)
    }
  }

  // ── Event / flow state ────────────────────────────────────────────────────
  const [eventKey, setEventKey] = useState('')
  const [rsvpKey, setRsvpKey] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [live, setLive] = useState<LiveState>(EMPTY_STATE)
  const [liveLoading, setLiveLoading] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [approving, setApproving] = useState<Record<string, boolean>>({})
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Load live state from Arkiv ────────────────────────────────────────────
  const loadLive = useCallback(async () => {
    if (!eventKey || !address) return
    setLiveLoading(true)
    try {
      const [event, rsvps, approvals, myRsvp, myApproval, myCheckin] = await Promise.all([
        getEvent(eventKey),
        listRsvpsForEvent(eventKey),
        listApprovalsForEvent(eventKey),
        getRsvpForAttendee(eventKey, address),
        getApprovalForAttendee(eventKey, address),
        getCheckin(eventKey, address),
      ])
      setLive({ event, rsvps, approvals, myRsvp, myApproval, myCheckin, lastRefreshed: Date.now() })
    } catch {
      // silent — keep previous state on transient errors
    } finally {
      setLiveLoading(false)
    }
  }, [eventKey, address])

  // Auto-poll every 5 s when an event is selected
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setLive(EMPTY_STATE)
    if (eventKey && address) {
      loadLive()
      intervalRef.current = setInterval(loadLive, 5000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [eventKey, address, loadLive])

  // ── Generic run wrapper ───────────────────────────────────────────────────
  async function run(label: string, fn: () => Promise<unknown>) {
    setRunning(label)
    try {
      const data = await fn()
      setLog(prev => [{ label, data }, ...prev])
      return data
    } catch (e) {
      setLog(prev => [{ label, data: null, error: String(e) }, ...prev])
      return null
    } finally {
      setRunning(null)
    }
  }

  // ── 1. Create & Publish event ─────────────────────────────────────────────
  async function createAndPublish(form: EventFormData) {
    await run('Create & Publish Event', async () => {
      const client = await getClient()
      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        startTime: form.startTime,
        endTime: form.endTime,
        maxCapacity: form.maxCapacity,
        requiresApproval: form.requiresApproval,
        tags: form.tags,
        imageUrl: form.imageUrl,
        ticketPrice: 0,
      }
      const { entityKey: key } = await createEvent(client, {
        hostWallet: address!,
        city: form.city,
        startTime: form.startTime,
        data: payload,
      })
      await publishEvent(client, key, payload, form.city, form.startTime, address!)
      setEventKey(key)
      return { entityKey: key, title: form.title }
    })
  }

  // ── 2. List published events ──────────────────────────────────────────────
  const listEvents = () => run('List Published Events', async () => {
    const events = await listPublishedEvents()
    return events.map(e => ({
      entityKey: e.entityKey,
      title: e.payload.title,
      requiresApproval: e.payload.requiresApproval,
    }))
  })

  // ── 3. RSVP ───────────────────────────────────────────────────────────────
  const doRsvp = () => run('RSVP', async () => {
    const client = await getClient()
    const result = await createRsvp(client, {
      eventEntityKey: eventKey,
      attendeeWallet: address!,
      message: '',
    })
    setRsvpKey(result.entityKey)
    setTimeout(loadLive, 2000)
    return result
  })

  // ── 4. Cancel RSVP ────────────────────────────────────────────────────────
  const doCancelRsvp = () => run('Cancel RSVP', async () => {
    if (!rsvpKey) throw new Error('No RSVP key — RSVP first')
    const client = await getClient()
    const result = await cancelRsvp(client, rsvpKey, eventKey, address!)
    setTimeout(loadLive, 2000)
    return result
  })

  // ── 5. Approve / Reject attendee (host) ───────────────────────────────────
  async function approveAttendee(attendeeWallet: `0x${string}`, decision: 'approved' | 'rejected') {
    const label = `${decision === 'approved' ? 'Approve' : 'Reject'} ${short(attendeeWallet)}`
    setApproving(prev => ({ ...prev, [attendeeWallet]: true }))
    try {
      const client = await getClient()
      const result = await createApproval(client, {
        eventEntityKey: eventKey,
        attendeeWallet,
        hostWallet: address!,
        decision,
      })
      setLog(prev => [{ label, data: result }, ...prev])
      setTimeout(loadLive, 2000)
    } catch (e) {
      setLog(prev => [{ label, data: null, error: String(e) }, ...prev])
    } finally {
      setApproving(prev => ({ ...prev, [attendeeWallet]: false }))
    }
  }

  // ── 6. Check in ───────────────────────────────────────────────────────────
  const doCheckin = () => run('Check In', async () => {
    const client = await getClient()
    const result = await createCheckin(client, {
      eventEntityKey: eventKey,
      attendeeWallet: address!,
      method: 'manual',
      proof: `checkin-${address}-${Date.now()}`,
    })
    setTimeout(loadLive, 2000)
    return result
  })

  // ── Calendar invite ──────────────────────────────────────────────────
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim() || !live.event) return
    setSendingInvite(true)
    try {
      const ev = live.event.payload
      const res = await fetch(`${BACKEND_URL}/calendar/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [inviteEmail.trim()],
          title: ev.title,
          description: ev.description || '',
          location: ev.location || '',
          startTime: ev.startTime,
          endTime: ev.endTime,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setLog(prev => [{ label: 'Send Calendar Invite', data: { to: inviteEmail.trim() } }, ...prev])
      setInviteEmail('')
      setShowInviteForm(false)
    } catch (err) {
      setLog(prev => [{ label: 'Send Calendar Invite', data: null, error: String(err) }, ...prev])
    } finally {
      setSendingInvite(false)
    }
  }

  // ── 6b. Deploy POAP collection (host) ────────────────────────────────
  const [poapAddress, setPoapAddress] = useState<string | null>(null)

  const doDeployPOAP = () => run('Deploy POAP Collection', async () => {
    if (!eventKey) throw new Error('No event selected')
    if (!live.event) throw new Error('Event not loaded yet')

    const title = live.event.payload.title
    // Generate a short symbol from the title (first letters, max 6 chars)
    const symbol = title
      .split(/\s+/)
      .map((w: string) => w[0]?.toUpperCase())
      .join('')
      .slice(0, 6) || 'POAP'

    const res = await fetch(`${BACKEND_URL}/poap/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${title} POAP`,
        symbol,
        eventId: eventKey,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)

    setPoapAddress(json.poapAddress)
    return { poapAddress: json.poapAddress, txHash: json.txHash, name: `${title} POAP`, symbol }
  })

  // ── 7. Mint POAP (backend pays gas) ──────────────────────────────────
  const doMintPOAP = () => run('Mint POAP', async () => {
    if (!address) throw new Error('No wallet address')

    const res = await fetch(`${BACKEND_URL}/poap/mint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: eventKey,
        attendee: address,
        tokenURI: `ipfs://poap-metadata/${eventKey}/${address}`,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)

    return { txHash: json.txHash, poapAddress: json.poapAddress, attendee: address }
  })

  // ── Derived state ─────────────────────────────────────────────────────────
  const rsvpsWithApproval = live.rsvps
    .filter(r => r.status !== 'cancelled')
    .map(r => ({
      rsvp: r,
      approval: live.approvals.find(
        a => a.attendeeWallet.toLowerCase() === r.attendeeWallet.toLowerCase()
      ) ?? null,
    }))

  const isHost = !!live.event && live.event.owner?.toLowerCase() === address?.toLowerCase()
  const myRsvpActive = !!live.myRsvp && live.myRsvp.status !== 'cancelled'
  // Gate all write operations: must have profile + wallet ready
  const canAct = hasProfile && walletReady
  const canRsvp = canAct && !!eventKey && !!live.event && !myRsvpActive
  const canCheckin = canAct && myRsvpActive && !live.myCheckin && (
    !live.event?.payload.requiresApproval || live.myApproval?.decision === 'approved'
  )
  const canMintPOAP = canAct && !!eventKey && !!live.myCheckin
  const secsAgo = live.lastRefreshed ? Math.round((Date.now() - live.lastRefreshed) / 1000) : null

  return (
    <div className="min-h-dvh bg-zinc-950 text-white p-4 pb-16">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Header */}
        <div className="pt-2 pb-1">
          <h1 className="text-xl font-bold tracking-tight">Event Flow Test</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Browser 1 = Host &nbsp;&middot;&nbsp; Browser 2 = Attendee &nbsp;&middot;&nbsp; State auto-syncs every 5 s via Arkiv
          </p>
        </div>

        {/* ── Wallet + Profile ─────────────────────────────────────────────── */}
        <Section title="Wallet &amp; Profile">
          {!ready ? (
            <p className="text-sm text-zinc-500">Loading&hellip;</p>
          ) : !authenticated ? (
            <Button size="sm" onClick={login}>Sign in with Email</Button>
          ) : (
            <div className="space-y-3">
              {/* Address row */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-xs font-mono text-zinc-300 break-all">{address ?? 'loading\u2026'}</span>
                  </div>
                  <p className="text-xs text-zinc-600 pl-4">
                    {walletReady ? 'wallet ready' : '⏳ waiting for embedded wallet'}
                    {' · '}{embeddedWallet?.walletClientType ?? 'no wallet'}
                  </p>
                </div>
                <button onClick={logout} className="text-xs text-zinc-600 hover:text-zinc-400 shrink-0">Sign out</button>
              </div>

              {/* Profile block */}
              {profileLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
                  <span className="text-xs text-zinc-500">Loading profile&hellip;</span>
                </div>
              ) : profile ? (
                /* ── Profile exists ── */
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge color="green">profile active</Badge>
                    <span className="text-sm font-semibold text-white">{profile.payload.displayName}</span>
                  </div>
                  {profile.payload.bio && (
                    <p className="text-xs text-zinc-400 pl-0.5">{profile.payload.bio}</p>
                  )}
                  <p className="text-xs text-zinc-600 pl-0.5">
                    hosted {profile.payload.eventsHosted} &middot; attended {profile.payload.eventsAttended}
                  </p>
                </div>
              ) : (
                /* ── No profile — show creation form ── */
                <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 space-y-3">
                  <p className="text-xs text-amber-400 font-medium">
                    ⚠ No profile found — create one to continue
                  </p>
                  <form onSubmit={handleCreateProfile} className="space-y-2">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">Display name <span className="text-zinc-600">*</span></label>
                      <Input
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        disabled={creatingProfile}
                        className="h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">Bio <span className="text-zinc-600">optional</span></label>
                      <Input
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        placeholder="Short bio"
                        disabled={creatingProfile}
                        className="h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 rounded-xl"
                      />
                    </div>
                    {profileError && (
                      <p className="text-xs text-red-400">{profileError}</p>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={creatingProfile || !walletReady}
                      className="rounded-xl text-xs h-8 px-4 w-full"
                    >
                      {creatingProfile ? '⏳ Creating\u2026' : 'Create Profile'}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── Profile gate banner ──────────────────────────────────────────── */}
        {authenticated && !profileLoading && !hasProfile && (
          <div className="rounded-2xl border border-amber-900/40 bg-amber-950/10 px-4 py-3 text-xs text-amber-500">
            Create a profile above to unlock all actions.
          </div>
        )}

        {/* ── Active event key ────────────────────────────────────────────── */}
        <Section title="Active Event Key">
          <div className="flex items-center gap-2">
            <Input
              value={eventKey}
              onChange={e => setEventKey(e.target.value)}
              placeholder="Paste event key — or create one below"
              className="h-7 text-xs font-mono bg-zinc-900 border-zinc-700 text-zinc-300 placeholder:text-zinc-700 rounded-lg"
            />
            {eventKey && (
              <button
                onClick={() => { setEventKey(''); setRsvpKey(''); setLive(EMPTY_STATE) }}
                className="text-xs text-zinc-600 hover:text-zinc-400 shrink-0"
              >✕</button>
            )}
          </div>
          {rsvpKey && (
            <p className="text-xs text-zinc-600 font-mono mt-1">My RSVP key: {short(rsvpKey)}</p>
          )}
        </Section>

        {/* ── Live State ─────────────────────────────────────────────────── */}
        {eventKey && (
          <section className="rounded-2xl border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Live State</h2>
              <div className="flex items-center gap-2">
                {liveLoading && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                {secsAgo !== null && (
                  <span className="text-xs text-zinc-600">{secsAgo === 0 ? 'just now' : `${secsAgo}s ago`}</span>
                )}
                <button onClick={loadLive} className="text-xs text-zinc-500 hover:text-zinc-300">↻ Refresh</button>
              </div>
            </div>

            {!live.event ? (
              <p className="text-xs text-zinc-500">Loading event&hellip;</p>
            ) : (
              <div className="space-y-3">

                {/* Event info */}
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 space-y-1.5">
                  <p className="text-sm font-semibold text-white">{live.event.payload.title}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge color="blue">published</Badge>
                    <Badge color={live.event.payload.requiresApproval ? 'yellow' : 'green'}>
                      {live.event.payload.requiresApproval ? 'approval required' : 'open RSVP'}
                    </Badge>
                    {isHost && <Badge color="purple">you are host</Badge>}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {fmtTime(live.event.payload.startTime)} &rarr; {fmtTime(live.event.payload.endTime)}
                    &nbsp;&middot;&nbsp;host: {short(live.event.owner)}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <button
                      onClick={() => {
                        const e = live.event!.payload
                        const fmt = (ts: number) => new Date(ts * 1000).toISOString().replace(/[-:]|\.\d{3}/g, '')
                        const params = new URLSearchParams({
                          action: 'TEMPLATE',
                          text: e.title,
                          dates: `${fmt(e.startTime)}/${fmt(e.endTime)}`,
                          details: e.description || '',
                          location: e.location || '',
                        })
                        window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank')
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Google Calendar
                    </button>
                    <button
                      onClick={() => {
                        const e = live.event!.payload
                        const params = new URLSearchParams({
                          title: e.title,
                          description: e.description || '',
                          location: e.location || '',
                          startTime: String(e.startTime),
                          endTime: String(e.endTime),
                        })
                        const url = `${BACKEND_URL}/calendar/download.ics?${params}`
                        window.open(url, '_blank')
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download .ics
                    </button>
                    <button
                      onClick={() => setShowInviteForm(prev => !prev)}
                      className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      Email Invite
                    </button>
                  </div>
                  {showInviteForm && (
                    <form onSubmit={handleSendInvite} className="flex gap-2 mt-2">
                      <input
                        type="email"
                        placeholder="attendee@example.com"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        required
                        className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="submit"
                        disabled={sendingInvite || !inviteEmail.trim()}
                        className="rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        {sendingInvite ? 'Sending…' : 'Send'}
                      </button>
                    </form>
                  )}
                </div>

                {/* RSVPs list */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    RSVPs ({rsvpsWithApproval.length})
                  </p>
                  {rsvpsWithApproval.length === 0 ? (
                    <p className="text-xs text-zinc-600">No RSVPs yet</p>
                  ) : (
                    rsvpsWithApproval.map(({ rsvp, approval }) => {
                      const isBusy = !!approving[rsvp.attendeeWallet]
                      const isMe = rsvp.attendeeWallet.toLowerCase() === address?.toLowerCase()
                      return (
                        <div
                          key={rsvp.entityKey}
                          className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="text-xs font-mono text-zinc-400 shrink-0">
                              {short(rsvp.attendeeWallet)}{isMe ? ' (you)' : ''}
                            </span>
                            {approval
                              ? <DecisionBadge decision={approval.decision} />
                              : <Badge color="yellow">pending</Badge>
                            }
                          </div>
                          {/* Host approve/reject — only if no decision yet, profile required */}
                          {isHost && !approval && canAct && (
                            <div className="flex gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                disabled={isBusy}
                                onClick={() => approveAttendee(rsvp.attendeeWallet, 'approved')}
                                className="h-6 px-2 text-xs rounded-lg bg-green-700 hover:bg-green-600"
                              >
                                {isBusy ? '⏳' : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isBusy}
                                onClick={() => approveAttendee(rsvp.attendeeWallet, 'rejected')}
                                className="h-6 px-2 text-xs rounded-lg"
                              >
                                {isBusy ? '⏳' : 'Reject'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {/* My attendee status */}
                {!isHost && (
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 space-y-1.5">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">My Status</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-xs text-zinc-500">RSVP</span>
                      {myRsvpActive
                        ? <Badge color="blue">{live.myRsvp!.status}</Badge>
                        : <span className="text-xs text-zinc-600">none</span>
                      }
                      <span className="text-xs text-zinc-500">Approval</span>
                      {live.myApproval
                        ? <DecisionBadge decision={live.myApproval.decision} />
                        : <span className="text-xs text-zinc-600">none</span>
                      }
                      <span className="text-xs text-zinc-500">Check-in</span>
                      {live.myCheckin
                        ? <Badge color="green">checked in</Badge>
                        : <span className="text-xs text-zinc-600">none</span>
                      }
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Step 1 — Host: Create Event ─────────────────────────────────── */}
        <Section title="Step 1 · Host — Create Event">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!canAct || running === 'Create & Publish Event'}
              onClick={() => setModalOpen(true)}
              className="rounded-xl text-xs h-7 px-3"
            >
              {running === 'Create & Publish Event' ? '⏳ Publishing\u2026' : 'Create & Publish Event'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={running === 'List Published Events'}
              onClick={listEvents}
              className="rounded-xl text-xs h-7 px-3"
            >
              {running === 'List Published Events' ? '⏳ ' : ''}List Published Events
            </Button>
          </div>
          <p className="text-xs text-zinc-600">
            {!hasProfile
              ? 'Create a profile first.'
              : 'Fills in event details, creates a draft and publishes immediately. Copy the event key to Browser 2.'
            }
          </p>
        </Section>

        {/* ── Step 2 — Attendee: RSVP ─────────────────────────────────────── */}
        <Section title="Step 2 · Attendee — RSVP">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!canRsvp || running === 'RSVP'}
              onClick={doRsvp}
              className="rounded-xl text-xs h-7 px-3"
            >
              {running === 'RSVP' ? '⏳ ' : ''}RSVP to Event
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!canAct || !myRsvpActive || !rsvpKey || running === 'Cancel RSVP'}
              onClick={doCancelRsvp}
              className="rounded-xl text-xs h-7 px-3"
            >
              {running === 'Cancel RSVP' ? '⏳ ' : ''}Cancel RSVP
            </Button>
          </div>
          <p className="text-xs text-zinc-600">
            {!hasProfile
              ? 'Create a profile first.'
              : !eventKey
                ? 'Paste an event key above first.'
                : !live.event
                  ? 'Waiting for event to load\u2026'
                  : myRsvpActive
                    ? `You have an active RSVP \u2014 status: ${live.myRsvp?.status}.`
                    : 'No active RSVP \u2014 you can RSVP now.'
            }
          </p>
        </Section>

        {/* ── Step 3 — Host: Approve ──────────────────────────────────────── */}
        <Section title="Step 3 · Host — Approve RSVPs">
          <p className="text-xs text-zinc-500">
            {!hasProfile
              ? 'Create a profile first.'
              : !eventKey
                ? 'Select an event above first.'
                : isHost
                  ? 'Use the Approve / Reject buttons in the Live State section above.'
                  : 'Switch to the host browser \u2014 Approve / Reject buttons appear there.'
            }
          </p>
        </Section>

        {/* ── Step 4 — Attendee: Check In ─────────────────────────────────── */}
        <Section title="Step 4 · Attendee — Check In">
          <Button
            size="sm"
            disabled={!canCheckin || running === 'Check In'}
            onClick={doCheckin}
            className="rounded-xl text-xs h-7 px-3"
          >
            {running === 'Check In' ? '⏳ ' : ''}Check In
          </Button>
          <p className="text-xs text-zinc-600">
            {!hasProfile
              ? 'Create a profile first.'
              : !myRsvpActive
                ? 'RSVP first (Step 2).'
                : live.myCheckin
                  ? '\u2713 Already checked in.'
                  : live.event?.payload.requiresApproval
                    ? live.myApproval?.decision === 'approved'
                      ? '\u2713 Approved \u2014 you can check in now.'
                      : 'Waiting for host approval (Step 3).'
                    : '\u2713 No approval required \u2014 you can check in.'
            }
          </p>
        </Section>

        {/* ── Step 5 — Host: Deploy POAP Collection ────────────────────── */}
        <Section title="Step 5 · Host — Deploy POAP Collection">
          <Button
            size="sm"
            disabled={!canAct || !eventKey || !live.event || !!poapAddress || running === 'Deploy POAP Collection'}
            onClick={doDeployPOAP}
            className="rounded-xl text-xs h-7 px-3"
          >
            {running === 'Deploy POAP Collection' ? '⏳ Deploying\u2026' : 'Deploy POAP Collection'}
          </Button>
          {poapAddress && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 space-y-1">
              <p className="text-xs text-green-400 font-medium">{'\u2713'} POAP collection deployed</p>
              <p className="text-xs font-mono text-zinc-400 break-all">{poapAddress}</p>
            </div>
          )}
          <p className="text-xs text-zinc-600">
            {!eventKey
              ? 'Select an event above first.'
              : !live.event
                ? 'Waiting for event to load\u2026'
                : poapAddress
                  ? 'Collection is live on Arbitrum Sepolia. Attendees can now mint after checking in.'
                  : `Will deploy "${live.event.payload.title} POAP" on Arbitrum Sepolia using event details from Arkiv.`
            }
          </p>
        </Section>

        {/* ── Step 6 — Attendee: Mint POAP ──────────────────────────────── */}
        <Section title="Step 6 · Attendee — Mint POAP">
          <Button
            size="sm"
            disabled={!canMintPOAP || running === 'Mint POAP'}
            onClick={doMintPOAP}
            className="rounded-xl text-xs h-7 px-3"
          >
            {running === 'Mint POAP' ? '⏳ Minting\u2026' : 'Mint POAP'}
          </Button>
          <p className="text-xs text-zinc-600">
            {!hasProfile
              ? 'Create a profile first.'
              : !live.myCheckin
                ? 'Check in first (Step 4).'
                : 'Mint your soulbound POAP on Arbitrum Sepolia. Backend signs the voucher, your wallet submits the tx.'
            }
          </p>
        </Section>

        {/* ── Operation Log ───────────────────────────────────────────────── */}
        {log.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Log ({log.length})
              </h2>
              <button onClick={() => setLog([])} className="text-xs text-zinc-600 hover:text-zinc-400">
                Clear
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {log.map((entry, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3 ${entry.error
                    ? 'bg-red-950/40 border border-red-900/40'
                    : 'bg-zinc-900 border border-zinc-800'
                  }`}
                >
                  <p className={`text-xs font-semibold mb-1 ${entry.error ? 'text-red-400' : 'text-zinc-400'}`}>
                    {entry.error ? '\u2717' : '\u2713'} {entry.label}
                  </p>
                  {entry.error ? (
                    <p className="text-xs text-red-300 font-mono break-all">{entry.error}</p>
                  ) : (
                    <pre className="text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(entry.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* ── Create Event Modal ────────────────────────────────────────────── */}
      <CreateEventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createAndPublish}
      />

    </div>
  )
}

// ── Small shared components ───────────────────────────────────────────────────

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
      {children}
    </section>
  )
}

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple'

function Badge({ color, children }: { color: BadgeColor; children: React.ReactNode }) {
  const cls: Record<BadgeColor, string> = {
    blue: 'bg-blue-900/50 text-blue-300',
    green: 'bg-green-900/50 text-green-300',
    yellow: 'bg-yellow-900/50 text-yellow-300',
    red: 'bg-red-900/50 text-red-300',
    purple: 'bg-purple-900/50 text-purple-300',
  }
  return <span className={`text-xs rounded-full px-2 py-0.5 ${cls[color]}`}>{children}</span>
}

function DecisionBadge({ decision }: { decision: string }) {
  if (decision === 'approved') return <Badge color="green">approved</Badge>
  if (decision === 'rejected') return <Badge color="red">rejected</Badge>
  return <Badge color="yellow">{decision}</Badge>
}
