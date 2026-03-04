'use client'

import { useState, useCallback } from 'react'
import { useArkivWallet } from './useArkivWallet'
import { createEvent } from '@/lib/arkiv/entities/event'
import type { EventPayload } from '@/lib/arkiv/types'

export interface CreateEventInput {
  title: string
  description: string
  location: string
  city: string
  startTime: number
  endTime: number
  maxCapacity: number
  requiresApproval: boolean
  tags: string[]
  imageUrl: string
  ticketPrice: number
}

export function useCreateEvent() {
  const { getClient, address } = useArkivWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async (input: CreateEventInput, status: 'draft' | 'published' | 'unlisted' = 'published') => {
    if (!address) throw new Error('No wallet connected')
    setLoading(true)
    setError(null)

    try {
      const client = await getClient()

      const payload: EventPayload = {
        title: input.title,
        description: input.description,
        location: input.location,
        startTime: input.startTime,
        endTime: input.endTime,
        maxCapacity: input.maxCapacity,
        requiresApproval: input.ticketPrice > 0 ? false : input.requiresApproval,
        tags: input.tags,
        imageUrl: input.imageUrl,
        ticketPrice: input.ticketPrice,
      }

      // Single tx — create directly as published
      const result = await createEvent(client, {
        hostWallet: address,
        city: input.city,
        startTime: input.startTime,
        data: payload,
        status,
      })

      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [getClient, address])

  return { submit, loading, error }
}
