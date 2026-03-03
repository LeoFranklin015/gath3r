'use client'

import { useState, useEffect, useCallback } from 'react'
import { listPublishedEvents } from '@/lib/arkiv/entities/event'
import type { EventPayload, ArkivEntity } from '@/lib/arkiv/types'

export function useEvents(city?: string) {
  const [events, setEvents] = useState<ArkivEntity<EventPayload>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await listPublishedEvents({ city }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [city])

  useEffect(() => { load() }, [load])

  return { events, loading, error, reload: load }
}
