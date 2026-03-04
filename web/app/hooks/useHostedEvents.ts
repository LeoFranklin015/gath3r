'use client'

import { useState, useEffect, useCallback } from 'react'
import { useArkivWallet } from './useArkivWallet'
import { listHostEvents } from '@/lib/arkiv/entities/event'
import type { EventPayload, ArkivEntity } from '@/lib/arkiv/types'

export function useHostedEvents() {
  const { address } = useArkivWallet()
  const [events, setEvents] = useState<ArkivEntity<EventPayload>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!address) {
      setEvents([])
      setLoading(false)
      return
    }
    setError(null)
    try {
      setEvents(await listHostEvents(address))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    load()
  }, [load])

  return { events, loading, error, reload: load }
}
