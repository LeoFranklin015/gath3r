'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useArkivWallet } from './useArkivWallet'
import { getEvent } from '@/lib/arkiv/entities/event'
import { listRsvpsForEvent, getRsvpForAttendee } from '@/lib/arkiv/entities/rsvp'
import { listApprovalsForEvent, getApprovalForAttendee } from '@/lib/arkiv/entities/approval'
import { getCheckin, listCheckinsForEvent } from '@/lib/arkiv/entities/checkin'
import type {
  EventPayload,
  ArkivEntity,
  RsvpEntity,
  ApprovalEntity,
  CheckinPayload,
  CheckinEntity,
} from '@/lib/arkiv/types'

const POLL_INTERVAL = 5_000

export function useEventDetail(entityKey: string) {
  const { address } = useArkivWallet()

  const [event, setEvent] = useState<ArkivEntity<EventPayload> | null>(null)
  const [rsvps, setRsvps] = useState<RsvpEntity[]>([])
  const [approvals, setApprovals] = useState<ApprovalEntity[]>([])
  const [myRsvp, setMyRsvp] = useState<RsvpEntity | null>(null)
  const [myApproval, setMyApproval] = useState<ApprovalEntity | null>(null)
  const [myCheckin, setMyCheckin] = useState<ArkivEntity<CheckinPayload> | null>(null)
  const [checkins, setCheckins] = useState<CheckinEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [ev, rs, ap, ci, mr, ma, mc] = await Promise.all([
        getEvent(entityKey),
        listRsvpsForEvent(entityKey),
        listApprovalsForEvent(entityKey),
        listCheckinsForEvent(entityKey),
        address ? getRsvpForAttendee(entityKey, address) : null,
        address ? getApprovalForAttendee(entityKey, address) : null,
        address ? getCheckin(entityKey, address) : null,
      ])
      setEvent(ev)
      setRsvps(rs)
      setApprovals(ap)
      setCheckins(ci)
      setMyRsvp(mr)
      setMyApproval(ma)
      setMyCheckin(mc)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }, [entityKey, address])

  // Initial load + polling
  useEffect(() => {
    load()
    intervalRef.current = setInterval(() => load(true), POLL_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [load])

  return { event, rsvps, approvals, checkins, myRsvp, myApproval, myCheckin, loading, error, reload: load }
}
