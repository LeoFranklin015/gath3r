'use client'

import { useState } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useArkivWallet } from '@/app/hooks/useArkivWallet'
import { publicClient } from '@/lib/arkiv/client'
import { ENTITY_TYPE } from '@/lib/arkiv/constants'
import { eq } from '@arkiv-network/sdk/query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Entity functions
import { createProfile, getProfileByWallet, renewProfile } from '@/lib/arkiv/entities/profile'
import { createEvent, publishEvent, getEvent, listPublishedEvents } from '@/lib/arkiv/entities/event'
import { createRsvp, cancelRsvp, listRsvpsForEvent, getRsvpForAttendee } from '@/lib/arkiv/entities/rsvp'
import { createCheckin, getCheckin } from '@/lib/arkiv/entities/checkin'
import { createApproval, listApprovalsForEvent } from '@/lib/arkiv/entities/approval'
import { createEventRecord, listEventRecordsByHost } from '@/lib/arkiv/entities/event-record'

interface TestResult {
  label: string
  data: unknown
  error?: string
}

export default function TestPage() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const { getClient, address, ready: walletReady } = useArkivWallet()
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')

  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState<string | null>(null)

  // Stored entity keys — auto-populated after each create, or manually typed
  const [eventKey, setEventKey] = useState('')
  const [rsvpKey, setRsvpKey] = useState('')
  const [checkinKey, setCheckinKey] = useState('')
  const [approvalKey, setApprovalKey] = useState('')
  const [targetWallet, setTargetWallet] = useState('')

  async function run(
    label: string,
    fn: () => Promise<unknown>,
    onSuccess?: (data: unknown) => void,
  ) {
    setRunning(label)
    try {
      const data = await fn()
      setResults(prev => [{ label, data }, ...prev])
      onSuccess?.(data)
    } catch (e) {
      setResults(prev => [{ label, data: null, error: String(e) }, ...prev])
    } finally {
      setRunning(null)
    }
  }

  // ── PROFILE ──────────────────────────────────────────────────────────────
  const testCreateProfile = () => run('Create Profile', async () => {
    const client = await getClient()
    return createProfile(client, address!, {
      displayName: 'Test User',
      bio: 'Arkiv integration test',
      avatar: '',
    })
  })

  const testGetMyProfile = () => run('Get My Profile', () =>
    getProfileByWallet(address!))

  const testGetProfile = () => run('Get Profile by Wallet', () =>
    getProfileByWallet((targetWallet || address!) as `0x${string}`))

  const testRenewProfile = () => run('Renew Profile', async () => {
    const profile = await getProfileByWallet(address!)
    if (!profile) throw new Error('No profile found for your wallet')
    const client = await getClient()
    return renewProfile(client, profile.entityKey)
  })

  // ── EVENT ─────────────────────────────────────────────────────────────────
  const testCreateEvent = () => run(
    'Create Event (draft)',
    async () => {
      const client = await getClient()
      const now = Math.floor(Date.now() / 1000)
      return createEvent(client, {
        hostWallet: address!,
        city: 'Test City',
        startTime: now + 3600,
        data: {
          title: 'Arkiv Test Event',
          description: 'Created from /test page',
          location: '123 Test Street',
          startTime: now + 3600,
          endTime: now + 7200,
          maxCapacity: 10,
          requiresApproval: false,
          tags: ['test', 'arkiv'],
          imageUrl: '',
        },
      })
    },
    (data) => {
      const d = data as { entityKey: string }
      if (d?.entityKey) setEventKey(d.entityKey)
    },
  )

  const testPublishEvent = () => run('Publish Event', async () => {
    if (!eventKey) throw new Error('No event key — run Create Event first')
    const client = await getClient()
    const now = Math.floor(Date.now() / 1000)
    return publishEvent(client, eventKey, {
      title: 'Arkiv Test Event',
      description: 'Published from /test page',
      location: '123 Test Street',
      startTime: now + 3600,
      endTime: now + 7200,
      maxCapacity: 10,
      requiresApproval: false,
      tags: ['test', 'arkiv'],
      imageUrl: '',
    }, 'Test City', now + 3600, address!)
  })

  const testGetEvent = () => run('Get Event', async () => {
    if (!eventKey) throw new Error('No event key — run Create Event first or paste one')
    return getEvent(eventKey)
  })

  const testListEvents = () => run('List Published Events', () =>
    listPublishedEvents())

  // ── RSVP ──────────────────────────────────────────────────────────────────
  const testCreateRsvp = () => run(
    'Create RSVP',
    async () => {
      if (!eventKey) throw new Error('No event key — run Create Event + Publish first')
      const client = await getClient()
      const now = Math.floor(Date.now() / 1000)
      const eventExpiresIn = 7200 + 90 * 24 * 60 * 60 // stub: 2h event + 90d buffer
      return createRsvp(client, {
        eventEntityKey: eventKey,
        attendeeWallet: address!,
        eventExpiresIn,
        message: 'Excited to attend!',
      })
    },
    (data) => {
      const d = data as { entityKey: string }
      if (d?.entityKey) setRsvpKey(d.entityKey)
    },
  )

  const testCancelRsvp = () => run('Cancel RSVP', async () => {
    if (!rsvpKey) throw new Error('No RSVP key — run Create RSVP first')
    if (!eventKey) throw new Error('No event key')
    const client = await getClient()
    const eventExpiresIn = 7200 + 90 * 24 * 60 * 60
    return cancelRsvp(client, rsvpKey, eventKey, address!, eventExpiresIn)
  })

  const testListRsvps = () => run(
    'List RSVPs for Event',
    async () => {
      if (!eventKey) throw new Error('No event key')
      return listRsvpsForEvent(eventKey)
    },
    (data) => {
      // Auto-populate targetWallet from the first RSVPer so Approval/Checkin can reference them
      const list = data as { entityKey: string; owner: string }[]
      if (list?.[0]?.owner && !targetWallet) setTargetWallet(list[0].owner)
    },
  )

  const testGetRsvpForAttendee = () => run('Get RSVP for Attendee', async () => {
    if (!eventKey) throw new Error('No event key')
    return getRsvpForAttendee(eventKey, (targetWallet || address!) as `0x${string}`)
  })

  // ── CHECKIN ───────────────────────────────────────────────────────────────
  const testCreateCheckin = () => run(
    'Create Checkin',
    async () => {
      if (!eventKey) throw new Error('No event key')
      const client = await getClient()
      return createCheckin(client, {
        eventEntityKey: eventKey,
        attendeeWallet: (targetWallet || address!) as `0x${string}`,
        method: 'manual',
        proof: `test-proof-${Date.now()}`,
      })
    },
    (data) => {
      const d = data as { entityKey: string }
      if (d?.entityKey) setCheckinKey(d.entityKey)
    },
  )

  const testGetCheckin = () => run('Get Checkin', async () => {
    if (!eventKey) throw new Error('No event key')
    return getCheckin(eventKey, (targetWallet || address!) as `0x${string}`)
  })

  // ── APPROVAL ──────────────────────────────────────────────────────────────
  const testCreateApproval = () => run(
    'Create Approval',
    async () => {
      if (!eventKey) throw new Error('No event key')
      const client = await getClient()
      const now = Math.floor(Date.now() / 1000)
      return createApproval(client, {
        eventEntityKey: eventKey,
        attendeeWallet: (targetWallet || address!) as `0x${string}`,
        hostWallet: address!,
        decision: 'approved',
        reason: 'Test approval',
        eventEndTime: now + 7200,
      })
    },
    (data) => {
      const d = data as { entityKey: string }
      if (d?.entityKey) setApprovalKey(d.entityKey)
    },
  )

  const testListApprovals = () => run('List Approvals for Event', async () => {
    if (!eventKey) throw new Error('No event key')
    return listApprovalsForEvent(eventKey)
  })

  // ── EVENT RECORD ──────────────────────────────────────────────────────────
  const testCreateEventRecord = () => run('Create Event Record', async () => {
    if (!eventKey) throw new Error('No event key')
    const client = await getClient()
    return createEventRecord(client, {
      eventEntityKey: eventKey,
      hostWallet: address!,
      eventName: 'Arkiv Test Event',
      hostName: 'Test User',
      eventTxHash: eventKey, // use eventKey as stub txHash
      eventDate: Math.floor(Date.now() / 1000),
    })
  })

  const testListEventRecords = () => run('List Event Records by Host', () =>
    listEventRecordsByHost((targetWallet || address!) as `0x${string}`))

  // ── RAW QUERIES ───────────────────────────────────────────────────────────
  const testRawQueryProfiles = () => run('Raw Query — All Profiles', async () => {
    const result = await publicClient
      .buildQuery()
      .where([eq('type', ENTITY_TYPE.PROFILE)])
      .withPayload(true)
      .fetch()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { count: result.entities.length, sample: result.entities.slice(0, 3).map((e: any) => ({ key: e.key, owner: e.owner, payload: e.toJson() })) }
  })

  const testRawQueryEvents = () => run('Raw Query — All Events', async () => {
    const result = await publicClient
      .buildQuery()
      .where([eq('type', ENTITY_TYPE.EVENT)])
      .withPayload(true)
      .fetch()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { count: result.entities.length, sample: result.entities.slice(0, 5).map((e: any) => ({ key: e.key, owner: e.owner, status: e.attributes?.find((a: any) => a.key === 'status')?.value, payload: e.toJson() })) }
  })

  const testRawQueryRsvps = () => run('Raw Query — All RSVPs', async () => {
    const result = await publicClient
      .buildQuery()
      .where([eq('type', ENTITY_TYPE.RSVP)])
      .withPayload(true)
      .fetch()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { count: result.entities.length, sample: result.entities.slice(0, 5).map((e: any) => ({ key: e.key, owner: e.owner })) }
  })

  // ── SECTIONS ──────────────────────────────────────────────────────────────
  type Btn = { label: string; fn: () => void; write?: boolean; disabled?: boolean }
  type Section = { title: string; buttons: Btn[] }

  const sections: Section[] = [
    {
      title: 'Profile',
      buttons: [
        { label: 'Create Profile', fn: testCreateProfile, write: true },
        { label: 'Renew Profile', fn: testRenewProfile, write: true },
        { label: 'Get My Profile', fn: testGetMyProfile, disabled: !address },
        { label: 'Get Profile by Wallet', fn: testGetProfile },
      ],
    },
    {
      title: 'Event',
      buttons: [
        { label: 'Create Event (draft)', fn: testCreateEvent, write: true },
        { label: 'Publish Event', fn: testPublishEvent, write: true, disabled: !eventKey },
        { label: 'Get Event', fn: testGetEvent, disabled: !eventKey },
        { label: 'List Published Events', fn: testListEvents },
      ],
    },
    {
      title: 'RSVP',
      buttons: [
        { label: 'Create RSVP', fn: testCreateRsvp, write: true, disabled: !eventKey },
        { label: 'Cancel RSVP', fn: testCancelRsvp, write: true, disabled: !rsvpKey },
        { label: 'List RSVPs for Event', fn: testListRsvps, disabled: !eventKey },
        { label: 'Get RSVP for Attendee', fn: testGetRsvpForAttendee, disabled: !eventKey },
      ],
    },
    {
      title: 'Checkin',
      buttons: [
        { label: 'Create Checkin', fn: testCreateCheckin, write: true, disabled: !eventKey },
        { label: 'Get Checkin', fn: testGetCheckin, disabled: !eventKey || !address },
      ],
    },
    {
      title: 'Approval',
      buttons: [
        { label: 'Create Approval', fn: testCreateApproval, write: true, disabled: !eventKey },
        { label: 'List Approvals', fn: testListApprovals, disabled: !eventKey },
      ],
    },
    {
      title: 'Event Record',
      buttons: [
        { label: 'Create Event Record', fn: testCreateEventRecord, write: true, disabled: !eventKey },
        { label: 'List Event Records by Host', fn: testListEventRecords },
      ],
    },
    {
      title: 'Raw Queries',
      buttons: [
        { label: 'All Profiles', fn: testRawQueryProfiles },
        { label: 'All Events', fn: testRawQueryEvents },
        { label: 'All RSVPs', fn: testRawQueryRsvps },
      ],
    },
  ]

  return (
    <div className="min-h-dvh bg-zinc-950 text-white p-4 pb-16">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Header */}
        <div className="pt-2 pb-1">
          <h1 className="text-xl font-bold tracking-tight">Arkiv Integration Test</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Gath3r &times; Kaolin — all entity functions</p>
        </div>

        {/* Wallet status */}
        <section className="rounded-2xl border border-zinc-800 p-4 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Wallet</h2>
          {!ready ? (
            <p className="text-sm text-zinc-500">Loading Privy...</p>
          ) : !authenticated ? (
            <div className="space-y-2">
              <p className="text-sm text-zinc-400">Not logged in</p>
              <Button size="sm" onClick={login}>Sign in with Email</Button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-xs font-mono text-zinc-300 break-all">{address ?? 'loading...'}</span>
              </div>
              <p className="text-xs text-zinc-500">
                {walletReady ? '✓ Arkiv client ready' : '⏳ waiting for embedded wallet'}
                {' · '}{embeddedWallet?.walletClientType ?? 'no wallet'}
              </p>
              <button onClick={logout} className="text-xs text-zinc-600 hover:text-zinc-400">Sign out</button>
            </div>
          )}
        </section>

        {/* Stored context */}
        <section className="rounded-2xl border border-zinc-800 p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Context Keys <span className="text-zinc-600 normal-case font-normal">— auto-filled after create, or paste manually</span>
          </h2>
          <div className="space-y-2">
            {[
              { label: 'Event Key', value: eventKey, set: setEventKey },
              { label: 'RSVP Key', value: rsvpKey, set: setRsvpKey },
              { label: 'Checkin Key', value: checkinKey, set: setCheckinKey },
              { label: 'Approval Key', value: approvalKey, set: setApprovalKey },
              { label: 'Attendee Wallet', value: targetWallet, set: setTargetWallet, placeholder: 'auto-set from RSVPs · defaults to own address' },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-28 shrink-0">{label}</span>
                <Input
                  value={value}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder ?? 'empty — run a create first'}
                  className="h-7 text-xs font-mono bg-zinc-900 border-zinc-700 text-zinc-300 placeholder:text-zinc-700 rounded-lg"
                />
                {value && (
                  <button onClick={() => set('')} className="text-xs text-zinc-700 hover:text-zinc-400 shrink-0">✕</button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Entity sections */}
        {sections.map(section => (
          <section key={section.title} className="rounded-2xl border border-zinc-800 p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{section.title}</h2>
            <div className="flex flex-wrap gap-2">
              {section.buttons.map(({ label, fn, write, disabled }) => {
                const isRunning = running === label
                const isDisabled = isRunning || disabled || (write && !walletReady)
                return (
                  <Button
                    key={label}
                    size="sm"
                    variant={write ? 'default' : 'secondary'}
                    disabled={isDisabled}
                    onClick={fn}
                    className="rounded-xl text-xs h-7 px-3"
                  >
                    {isRunning ? '⏳ ' : ''}{label}
                  </Button>
                )
              })}
            </div>
          </section>
        ))}

        {/* Results */}
        {results.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Results <span className="text-zinc-600 font-normal normal-case">({results.length})</span>
              </h2>
              <button onClick={() => setResults([])} className="text-xs text-zinc-600 hover:text-zinc-400">
                Clear all
              </button>
            </div>
            <div className="space-y-2 max-h-[32rem] overflow-y-auto">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3 ${r.error
                    ? 'bg-red-950/40 border border-red-900/40'
                    : 'bg-zinc-900 border border-zinc-800'
                  }`}
                >
                  <p className={`text-xs font-semibold mb-1.5 ${r.error ? 'text-red-400' : 'text-zinc-400'}`}>
                    {r.error ? '✗' : '✓'} {r.label}
                  </p>
                  {r.error ? (
                    <p className="text-xs text-red-300 font-mono break-all">{r.error}</p>
                  ) : (
                    <pre className="text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(r.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
