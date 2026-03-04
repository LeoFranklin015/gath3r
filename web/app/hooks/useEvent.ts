'use client'

import { useState, useEffect, useCallback } from 'react'
import { getEvent } from '@/lib/arkiv/entities/event'
import { listRsvpsForEvent } from '@/lib/arkiv/entities/rsvp'
import type { EventPayload, ArkivEntity, RsvpEntity } from '@/lib/arkiv/types'

export function useEvent(entityKey: string) {
  const [event, setEvent] = useState<ArkivEntity<EventPayload> | null>(null)
  const [rsvps, setRsvps] = useState<RsvpEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ev, rs] = await Promise.all([
        getEvent(entityKey),
        listRsvpsForEvent(entityKey),
      ])
      setEvent(ev)
      setRsvps(rs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }, [entityKey])

  useEffect(() => { load() }, [load])

  return { event, rsvps, loading, error, reload: load }
}
