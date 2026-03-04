import { jsonToPayload } from '@arkiv-network/sdk'
import { eq } from '@arkiv-network/sdk/query'
import { publicClient } from '@/lib/arkiv/client'
import { ENTITY_TYPE, EXPIRY_BUFFER_SECS, secondsUntil } from '@/lib/arkiv/constants'
import type { ApprovalPayload, ApprovalEntity, WriteResult, ApprovalDecision } from '@/lib/arkiv/types'
import { getEvent } from './event'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalletClient = any

export interface CreateApprovalInput {
  eventEntityKey: string
  attendeeWallet: `0x${string}`
  hostWallet: `0x${string}`
  decision: ApprovalDecision
  reason?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function entityToApproval(e: any): ApprovalEntity {
  const attr = (key: string) => e.attributes?.find((a: any) => a.key === key)?.value ?? ''
  return {
    entityKey: e.key,
    owner: (e.owner || attr('hostWallet')) as `0x${string}`,
    attendeeWallet: attr('attendeeWallet') as `0x${string}`,
    decision: (attr('decision') || 'rejected') as ApprovalDecision,
    payload: e.toJson() as ApprovalPayload,
  }
}

// Approval owned by host wallet. Expires eventEnd + 14 days.
export async function createApproval(
  walletClient: WalletClient,
  input: CreateApprovalInput,
): Promise<WriteResult> {
  const event = await getEvent(input.eventEntityKey)
  if (!event) throw new Error('Event not found')
  const expiresIn = Math.floor(secondsUntil(event.payload.endTime) + EXPIRY_BUFFER_SECS.APPROVAL)
  const payload: ApprovalPayload = {
    reason: input.reason ?? '',
    decidedAt: Math.floor(Date.now() / 1000),
  }

  const { entityKey, txHash } = await walletClient.createEntity({
    payload: jsonToPayload(payload),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: ENTITY_TYPE.APPROVAL },
      { key: 'eventId', value: input.eventEntityKey },
      { key: 'attendeeWallet', value: input.attendeeWallet },
      { key: 'hostWallet', value: input.hostWallet },
      { key: 'decision', value: input.decision },
    ],
    expiresIn,
  })

  return { entityKey, txHash }
}

export async function listApprovalsForEvent(eventEntityKey: string): Promise<ApprovalEntity[]> {
  const result = await publicClient
    .buildQuery()
    .where([
      eq('type', ENTITY_TYPE.APPROVAL),
      eq('eventId', eventEntityKey),
    ])
    .withAttributes(true)
    .withMetadata(true)
    .withPayload(true)
    .fetch()

  return result.entities.map(entityToApproval)
}

export async function listApprovalsForWallet(
  attendeeWallet: `0x${string}`,
): Promise<ApprovalEntity[]> {
  const result = await publicClient
    .buildQuery()
    .where([
      eq('type', ENTITY_TYPE.APPROVAL),
      eq('attendeeWallet', attendeeWallet),
    ])
    .withAttributes(true)
    .withMetadata(true)
    .withPayload(true)
    .fetch()

  return result.entities.map(entityToApproval)
}

export async function getApprovalForAttendee(
  eventEntityKey: string,
  attendeeWallet: `0x${string}`,
): Promise<ApprovalEntity | null> {
  const result = await publicClient
    .buildQuery()
    .where([
      eq('type', ENTITY_TYPE.APPROVAL),
      eq('eventId', eventEntityKey),
      eq('attendeeWallet', attendeeWallet),
    ])
    .withAttributes(true)
    .withMetadata(true)
    .withPayload(true)
    .fetch()

  const entity = result.entities[0]
  if (!entity) return null
  return entityToApproval(entity)
}
