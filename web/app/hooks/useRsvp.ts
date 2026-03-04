'use client'

import { useCallback } from 'react'
import { useArkivWallet } from './useArkivWallet'
import { createRsvp, cancelRsvp, getRsvpForAttendee } from '@/lib/arkiv/entities/rsvp'

export function useRsvp() {
  const { getClient, address } = useArkivWallet()

  const rsvp = useCallback(async (
    eventEntityKey: string,
    message?: string,
    paymentTxHash?: string,
  ) => {
    if (!address) throw new Error('No wallet connected')
    const client = await getClient()
    return createRsvp(client, { eventEntityKey, attendeeWallet: address, message, paymentTxHash })
  }, [getClient, address])

  const cancel = useCallback(async (
    entityKey: string,
    eventEntityKey: string,
  ) => {
    if (!address) throw new Error('No wallet connected')
    const client = await getClient()
    return cancelRsvp(client, entityKey, eventEntityKey, address)
  }, [getClient, address])

  const check = useCallback(async (eventEntityKey: string) => {
    if (!address) return null
    return getRsvpForAttendee(eventEntityKey, address)
  }, [address])

  return { rsvp, cancel, check }
}
