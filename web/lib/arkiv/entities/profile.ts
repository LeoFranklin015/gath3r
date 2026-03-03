import { jsonToPayload, NoEntityFoundError } from '@arkiv-network/sdk'
import { eq } from '@arkiv-network/sdk/query'
import { publicClient } from '@/lib/arkiv/client'
import { ENTITY_TYPE, EXPIRES_IN } from '@/lib/arkiv/constants'
import type { ProfilePayload, ArkivEntity, WriteResult } from '@/lib/arkiv/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalletClient = any

export async function createProfile(
  walletClient: WalletClient,
  address: `0x${string}`,
  data: Pick<ProfilePayload, 'displayName' | 'bio' | 'avatar'>,
): Promise<WriteResult> {
  const payload: ProfilePayload = {
    ...data,
    eventsHosted: 0,
    eventsAttended: 0,
    showUpRate: 0,
  }

  const { entityKey, txHash } = await walletClient.createEntity({
    payload: jsonToPayload(payload),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: ENTITY_TYPE.PROFILE },
      { key: 'wallet', value: address },
    ],
    expiresIn: EXPIRES_IN.PROFILE,
  })

  return { entityKey, txHash }
}

export async function getProfileByWallet(
  wallet: `0x${string}`,
): Promise<ArkivEntity<ProfilePayload> | null> {
  const result = await publicClient
    .buildQuery()
    .where([eq('type', ENTITY_TYPE.PROFILE), eq('wallet', wallet)])
    .withPayload(true)
    .fetch()

  const entity = result.entities[0]
  if (!entity) return null

  return {
    entityKey: entity.key,
    owner: (entity.owner ?? wallet) as `0x${string}`,
    payload: entity.toJson() as ProfilePayload,
  }
}

export async function renewProfile(
  walletClient: WalletClient,
  entityKey: string,
): Promise<string> {
  const { txHash } = await walletClient.extendEntity({
    entityKey,
    expiresIn: EXPIRES_IN.PROFILE,
  })
  return txHash
}

// Re-export NoEntityFoundError so callers can catch it without a direct SDK import
export { NoEntityFoundError }
