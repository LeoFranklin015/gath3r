import { jsonToPayload } from '@arkiv-network/sdk'
import { eq } from '@arkiv-network/sdk/query'
import { publicClient } from '@/lib/arkiv/client'
import { ENTITY_TYPE } from '@/lib/arkiv/constants'
import type { RsvpPayload, ArkivEntity, WriteResult, RsvpStatus } from '@/lib/arkiv/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalletClient = any

export interface CreateRsvpInput {
  eventEntityKey: string
  attendeeWallet: `0x${string}`
  eventExpiresIn: number   // same expiry as parent event — no orphans
  message?: string
}

// RSVP owned by attendee wallet. expiresIn matches the event so they die together.
export async function createRsvp(
  walletClient: WalletClient,
  input: CreateRsvpInput,
): Promise<WriteResult> {
  const payload: RsvpPayload = {
    message: input.message ?? '',
    createdAt: Math.floor(Date.now() / 1000),
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
    expiresIn: input.eventExpiresIn,
  })

  return { entityKey, txHash }
}

export async function cancelRsvp(
  walletClient: WalletClient,
  entityKey: string,
  eventEntityKey: string,
  attendeeWallet: `0x${string}`,
  eventExpiresIn: number,
): Promise<WriteResult> {
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
    expiresIn: eventExpiresIn,
  })

  return { entityKey: result.entityKey, txHash: result.txHash }
}

export async function listRsvpsForEvent(
  eventEntityKey: string,
): Promise<ArkivEntity<RsvpPayload>[]> {
  const result = await publicClient
    .buildQuery()
    .where([
      eq('type', ENTITY_TYPE.RSVP),
      eq('eventId', eventEntityKey),
    ])
    .withPayload(true)
    .fetch()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.entities.map((e: any) => ({
    entityKey: e.key,
    owner: (e.owner || e.attributes?.find((a: any) => a.key === 'attendeeWallet')?.value || '') as `0x${string}`,
    payload: e.toJson() as RsvpPayload,
  }))
}

export async function getRsvpForAttendee(
  eventEntityKey: string,
  attendeeWallet: `0x${string}`,
): Promise<ArkivEntity<RsvpPayload> | null> {
  const result = await publicClient
    .buildQuery()
    .where([
      eq('type', ENTITY_TYPE.RSVP),
      eq('eventId', eventEntityKey),
      eq('attendeeWallet', attendeeWallet),
    ])
    .withPayload(true)
    .fetch()

  const entity = result.entities[0]
  if (!entity) return null

  return {
    entityKey: entity.key,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    owner: (entity.owner || (entity as any).attributes?.find((a: any) => a.key === 'attendeeWallet')?.value || attendeeWallet) as `0x${string}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: (entity as any).toJson() as RsvpPayload,
  }
}
