import { jsonToPayload } from '@arkiv-network/sdk'
import { eq } from '@arkiv-network/sdk/query'
import { publicClient } from '@/lib/arkiv/client'
import { ENTITY_TYPE, EXPIRY_BUFFER_SECS, secondsUntil } from '@/lib/arkiv/constants'
import type { RsvpPayload, RsvpEntity, WriteResult, RsvpStatus } from '@/lib/arkiv/types'
import { getEvent } from './event'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalletClient = any

export interface CreateRsvpInput {
  eventEntityKey: string
  attendeeWallet: `0x${string}`
  message?: string
  paymentTxHash?: string
}

// RSVP owned by attendee wallet. expiresIn matches the event so they die together.
export async function createRsvp(
  walletClient: WalletClient,
  input: CreateRsvpInput,
): Promise<WriteResult> {
  const event = await getEvent(input.eventEntityKey)
  if (!event) throw new Error('Event not found')
  const expiresIn = Math.floor(secondsUntil(event.payload.endTime) + EXPIRY_BUFFER_SECS.EVENT)

  const payload: RsvpPayload = {
    message: input.message ?? '',
    createdAt: Math.floor(Date.now() / 1000),
    ...(input.paymentTxHash ? { paymentTxHash: input.paymentTxHash } : {}),
  }

  const { entityKey, txHash } = await walletClient.createEntity({
    payload: jsonToPayload(payload),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: ENTITY_TYPE.RSVP },
      { key: 'eventId', value: input.eventEntityKey },
      { key: 'attendeeWallet', value: input.attendeeWallet },
      { key: 'status', value: 'pending' as RsvpStatus },
    ],
    expiresIn,
  })

  return { entityKey, txHash }
}

export async function cancelRsvp(
  walletClient: WalletClient,
  entityKey: string,
  eventEntityKey: string,
  attendeeWallet: `0x${string}`,
): Promise<WriteResult> {
  const event = await getEvent(eventEntityKey)
  if (!event) throw new Error('Event not found')
  const expiresIn = Math.floor(secondsUntil(event.payload.endTime) + EXPIRY_BUFFER_SECS.EVENT)

  const payload: RsvpPayload = {
    message: '',
    createdAt: Math.floor(Date.now() / 1000),
  }

  const result = await walletClient.updateEntity({
    entityKey,
    payload: jsonToPayload(payload),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: ENTITY_TYPE.RSVP },
      { key: 'eventId', value: eventEntityKey },
      { key: 'attendeeWallet', value: attendeeWallet },
      { key: 'status', value: 'cancelled' as RsvpStatus },
    ],
    expiresIn,
  })

  return { entityKey: result.entityKey, txHash: result.txHash }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function entityToRsvp(e: any): RsvpEntity {
  const attr = (key: string) => e.attributes?.find((a: any) => a.key === key)?.value ?? ''
  return {
    entityKey: e.key,
    owner: (e.owner || attr('attendeeWallet')) as `0x${string}`,
    attendeeWallet: (attr('attendeeWallet') || e.owner || '') as `0x${string}`,
    status: (attr('status') || 'pending') as RsvpStatus,
    payload: e.toJson() as RsvpPayload,
  }
}

export async function listRsvpsForEvent(eventEntityKey: string): Promise<RsvpEntity[]> {
  const result = await publicClient
    .buildQuery()
    .where([
      eq('type', ENTITY_TYPE.RSVP),
      eq('eventId', eventEntityKey),
    ])
    .withAttributes(true)
    .withMetadata(true)
    .withPayload(true)
    .fetch()

  return result.entities.map(entityToRsvp)
}

export async function listRsvpsForWallet(
  attendeeWallet: `0x${string}`,
): Promise<RsvpEntity[]> {
  const result = await publicClient
    .buildQuery()
    .where([
      eq('type', ENTITY_TYPE.RSVP),
      eq('attendeeWallet', attendeeWallet),
    ])
    .withAttributes(true)
    .withMetadata(true)
    .withPayload(true)
    .fetch()

  return result.entities.map(entityToRsvp)
}

export async function getRsvpForAttendee(
  eventEntityKey: string,
  attendeeWallet: `0x${string}`,
): Promise<RsvpEntity | null> {
  const result = await publicClient
    .buildQuery()
    .where([
      eq('type', ENTITY_TYPE.RSVP),
      eq('eventId', eventEntityKey),
      eq('attendeeWallet', attendeeWallet),
    ])
    .withAttributes(true)
    .withMetadata(true)
    .withPayload(true)
    .fetch()

  const entity = result.entities[0]
  if (!entity) return null
  return entityToRsvp(entity)
}
