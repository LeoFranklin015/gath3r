import { jsonToPayload } from '@arkiv-network/sdk'
import { eq } from '@arkiv-network/sdk/query'
import { publicClient } from '@/lib/arkiv/client'
import { ENTITY_TYPE, EXPIRES_IN } from '@/lib/arkiv/constants'
import type { EventRecordPayload, ArkivEntity, WriteResult } from '@/lib/arkiv/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalletClient = any

export interface CreateEventRecordInput {
  eventEntityKey: string
  hostWallet: `0x${string}`
  eventName: string
  hostName: string
  eventTxHash: string
  eventDate: number      // unix timestamp
}

// Snapshot an event into a permanent-ish record (365 days).
// Called when an event transitions to ended/cancelled.
// This tombstone survives the parent EVENT entity expiry — historical record.
export async function createEventRecord(
  walletClient: WalletClient,
  input: CreateEventRecordInput,
): Promise<WriteResult> {
  const payload: EventRecordPayload = {
    eventName: input.eventName,
    hostName: input.hostName,
    eventTxHash: input.eventTxHash,
    eventDate: input.eventDate,
  }

  const { entityKey, txHash } = await walletClient.createEntity({
    payload: jsonToPayload(payload),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: ENTITY_TYPE.EVENT_RECORD },
      { key: 'eventRefId', value: input.eventEntityKey },
      { key: 'hostWallet', value: input.hostWallet },
    ],
    expiresIn: EXPIRES_IN.EVENT_RECORD,
  })

  return { entityKey, txHash }
}

// List event records for a host wallet — used on the profile page history tab.
export async function listEventRecordsByHost(
  hostWallet: `0x${string}`,
): Promise<ArkivEntity<EventRecordPayload>[]> {
  const result = await publicClient
    .buildQuery()
    .where([
      eq('type', ENTITY_TYPE.EVENT_RECORD),
      eq('hostWallet', hostWallet),
    ])
    .withPayload(true)
    .fetch()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.entities.map((e: any) => ({
    entityKey: e.key,
    owner: (e.owner || e.attributes?.find((a: any) => a.key === 'hostWallet')?.value || hostWallet) as `0x${string}`,
    payload: e.toJson() as EventRecordPayload,
  }))
}
