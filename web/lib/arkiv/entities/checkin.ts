import { jsonToPayload } from '@arkiv-network/sdk'
import { eq } from '@arkiv-network/sdk/query'
import { publicClient } from '@/lib/arkiv/client'
import { ENTITY_TYPE, EXPIRES_IN } from '@/lib/arkiv/constants'
import type { CheckinPayload, ArkivEntity, WriteResult, CheckinMethod } from '@/lib/arkiv/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalletClient = any

export interface CreateCheckinInput {
  eventEntityKey: string
  attendeeWallet: `0x${string}`
  method: CheckinMethod
  proof: string     // QR hash or geo string
}

// 7-day expiry = POAP minting window. After it expires, the window is closed.
export async function createCheckin(
  walletClient: WalletClient,
  input: CreateCheckinInput,
): Promise<WriteResult> {
  const payload: CheckinPayload = {
    checkedInAt: Math.floor(Date.now() / 1000),
    proof: input.proof,
  }

  const { entityKey, txHash } = await walletClient.createEntity({
    payload: jsonToPayload(payload),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: ENTITY_TYPE.CHECKIN },
      { key: 'eventId', value: input.eventEntityKey },
      { key: 'attendeeWallet', value: input.attendeeWallet },
      { key: 'method', value: input.method },
    ],
    expiresIn: EXPIRES_IN.CHECKIN,
  })

  return { entityKey, txHash }
}

export async function getCheckin(
  eventEntityKey: string,
  attendeeWallet: `0x${string}`,
): Promise<ArkivEntity<CheckinPayload> | null> {
  const result = await publicClient
    .buildQuery()
    .where([
      eq('type', ENTITY_TYPE.CHECKIN),
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
    payload: (entity as any).toJson() as CheckinPayload,
  }
}
