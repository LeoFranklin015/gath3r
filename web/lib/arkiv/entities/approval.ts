import { jsonToPayload } from '@arkiv-network/sdk'
import { eq } from '@arkiv-network/sdk/query'
import { publicClient } from '@/lib/arkiv/client'
import { ENTITY_TYPE, EXPIRY_BUFFER_SECS, secondsUntil } from '@/lib/arkiv/constants'
import type { ApprovalPayload, ArkivEntity, WriteResult, ApprovalDecision } from '@/lib/arkiv/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalletClient = any



export interface CreateApprovalInput {
  eventEntityKey: string
  attendeeWallet: `0x${string}`
  hostWallet: `0x${string}`
  decision: ApprovalDecision
  reason?: string
  eventEndTime: number   // unix timestamp — drives expiry
}

// Approval owned by host wallet. Expires eventEnd + 14 days.
export async function createApproval(
  walletClient: WalletClient,
  input: CreateApprovalInput,
): Promise<WriteResult> {
  const expiresIn = secondsUntil(input.eventEndTime) + EXPIRY_BUFFER_SECS.APPROVAL
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

export async function listApprovalsForEvent(
  eventEntityKey: string,
): Promise<ArkivEntity<ApprovalPayload>[]> {
  const result = await publicClient
    .buildQuery()
    .where([
      eq('type', ENTITY_TYPE.APPROVAL),
      eq('eventId', eventEntityKey),
    ])
    .withPayload(true)
    .fetch()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.entities.map((e: any) => ({
    entityKey: e.key,
    owner: (e.owner || e.attributes?.find((a: any) => a.key === 'hostWallet')?.value || '') as `0x${string}`,
    // include the attendeeWallet so callers know who was approved
    attendeeWallet: (e.attributes?.find((a: any) => a.key === 'attendeeWallet')?.value || '') as `0x${string}`,
    payload: e.toJson() as ApprovalPayload,
  }))
}
