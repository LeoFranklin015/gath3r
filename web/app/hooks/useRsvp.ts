'use client'

import { useCallback } from 'react'
import { useArkivWallet } from './useArkivWallet'
import { createRsvp, cancelRsvp, getRsvpForAttendee } from '@/lib/arkiv/entities/rsvp'
import { EXPIRY_BUFFER_SECS, secondsUntil } from '@/lib/arkiv/constants'



export function useRsvp() {
  const { getClient, address } = useArkivWallet()

  const rsvp = useCallback(async (
    eventEntityKey: string,
    eventEndTime: number,
    message?: string,
  ) => {
    if (!address) throw new Error('No wallet connected')
    const client = await getClient()
    const eventExpiresIn = secondsUntil(eventEndTime) + EXPIRY_BUFFER_SECS.EVENT
    return createRsvp(client, { eventEntityKey, attendeeWallet: address, eventExpiresIn, message })
  }, [getClient, address])

  const cancel = useCallback(async (
    entityKey: string,
    eventEntityKey: string,
    eventEndTime: number,
  ) => {
    if (!address) throw new Error('No wallet connected')
    const client = await getClient()
    const eventExpiresIn = secondsUntil(eventEndTime) + EXPIRY_BUFFER_SECS.EVENT
    return cancelRsvp(client, entityKey, eventEntityKey, address, eventExpiresIn)
  }, [getClient, address])

  const check = useCallback(async (eventEntityKey: string) => {
    if (!address) return null
    return getRsvpForAttendee(eventEntityKey, address)
  }, [address])

  return { rsvp, cancel, check }
}
