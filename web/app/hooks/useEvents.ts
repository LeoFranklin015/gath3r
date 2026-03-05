'use client'

import { useState, useEffect, useCallback } from 'react'
import { listPublishedEvents } from '@/lib/arkiv/entities/event'
import type { EventPayload, ArkivEntity } from '@/lib/arkiv/types'

export interface UseEventsOptions {
  city?: string
  startTimeGte?: number
  startTimeLte?: number
}

export function useEvents(options: UseEventsOptions = {}) {
  const { city, startTimeGte, startTimeLte } = options
  const [events, setEvents] = useState<ArkivEntity<EventPayload>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await listPublishedEvents({ city, startTimeGte, startTimeLte }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [city, startTimeGte, startTimeLte])

  useEffect(() => { load() }, [load])

  return { events, loading, error, reload: load }
}
