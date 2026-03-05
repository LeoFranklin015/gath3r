'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { eq } from '@arkiv-network/sdk/query'
import { useArkivWallet } from './useArkivWallet'
import { publicClient } from '@/lib/arkiv/client'
import { ENTITY_TYPE } from '@/lib/arkiv/constants'
import { getEvent, listDraftEvents } from '@/lib/arkiv/entities/event'
import type { EventPayload, ArkivEntity } from '@/lib/arkiv/types'

export type MyEventStatus = 'going' | 'pending' | 'draft'

export interface MyEvent {
  event: ArkivEntity<EventPayload>
  status: MyEventStatus
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function attr(entity: any, key: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return entity.attributes?.find((a: any) => a.key === key)?.value ?? ''
}

export function useMyEvents() {
  const { address } = useArkivWallet()
  const [myEvents, setMyEvents] = useState<MyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!address) {
      setMyEvents([])
      setLoading(false)
      return
    }

    setError(null)
    try {
      // Fetch user's RSVPs, approvals, and draft events in parallel
      const [rsvpResult, approvalResult, drafts] = await Promise.all([
        publicClient
          .buildQuery()
          .where([eq('type', ENTITY_TYPE.RSVP), eq('attendeeWallet', address)])
          .withAttributes(true)
          .withMetadata(true)
          .withPayload(true)
          .fetch(),
        publicClient
          .buildQuery()
          .where([eq('type', ENTITY_TYPE.APPROVAL), eq('attendeeWallet', address)])
          .withAttributes(true)
          .withMetadata(true)
          .withPayload(true)
          .fetch(),
        listDraftEvents(address),
      ])

      // Extract active RSVP eventIds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rsvpEventIds = (rsvpResult.entities as any[])
        .map((e) => ({ eventId: attr(e, 'eventId'), status: attr(e, 'status') }))
        .filter((r) => r.eventId && r.status !== 'cancelled')

      // Build approval lookup: eventId -> decision
      const approvalByEvent = new Map<string, string>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const e of approvalResult.entities as any[]) {
        const eventId = attr(e, 'eventId')
        const decision = attr(e, 'decision')
        if (eventId) approvalByEvent.set(eventId, decision)
      }

      // Fetch all RSVP events in parallel
      const uniqueEventIds = [...new Set(rsvpEventIds.map((r) => r.eventId))]
      const eventResults = await Promise.all(
        uniqueEventIds.map((id) => getEvent(id)),
      )

      // Build result: going vs pending vs draft
      const results: MyEvent[] = []

      // Add draft events
      for (const draft of drafts) {
        results.push({ event: draft, status: 'draft' })
      }

      // Add RSVP events
      for (const ev of eventResults) {
        if (!ev) continue

        let status: MyEventStatus
        if (!ev.payload.requiresApproval || approvalByEvent.get(ev.entityKey) === 'approved') {
          status = 'going'
        } else {
          status = 'pending'
        }

        results.push({ event: ev, status })
      }

      setMyEvents(results)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    load()
  }, [load])

  const going = useMemo(
    () => myEvents.filter((e) => e.status === 'going').map((e) => e.event),
    [myEvents],
  )

  const pending = useMemo(
    () => myEvents.filter((e) => e.status === 'pending').map((e) => e.event),
    [myEvents],
  )

  const drafts = useMemo(
    () => myEvents.filter((e) => e.status === 'draft').map((e) => e.event),
    [myEvents],
  )

  const statusMap = useMemo(() => {
    const map = new Map<string, MyEventStatus>()
    for (const me of myEvents) {
      map.set(me.event.entityKey, me.status)
    }
    return map
  }, [myEvents])

  return { myEvents, going, pending, drafts, statusMap, loading, error, reload: load }
}
