import { jsonToPayload, NoEntityFoundError } from '@arkiv-network/sdk'
import { eq } from '@arkiv-network/sdk/query'
import { publicClient } from '@/lib/arkiv/client'
import { ENTITY_TYPE, EXPIRY_BUFFER_SECS, secondsUntil } from '@/lib/arkiv/constants'
import type { EventPayload, ArkivEntity, WriteResult, EventStatus } from '@/lib/arkiv/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalletClient = any



export interface CreateEventInput {
  hostWallet: `0x${string}`
  city: string
  startTime: number        // unix timestamp
  data: EventPayload
  status?: EventStatus     // defaults to 'draft'
}

export async function createEvent(
  walletClient: WalletClient,
  input: CreateEventInput,
): Promise<WriteResult> {
  const expiresIn = Math.floor(secondsUntil(input.data.endTime) + EXPIRY_BUFFER_SECS.EVENT)
  const startTime = Math.floor(input.startTime)

  const safeData = {
    ...input.data,
    startTime: Math.floor(input.data.startTime),
    endTime: Math.floor(input.data.endTime),
  }

  const { entityKey, txHash } = await walletClient.createEntity({
    payload: jsonToPayload(safeData),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: ENTITY_TYPE.EVENT },
      { key: 'hostWallet', value: input.hostWallet },
      { key: 'status', value: input.status ?? 'draft' },
      { key: 'city', value: input.city },
      { key: 'startTime', value: startTime.toString() },
    ],
    expiresIn,
  })

  return { entityKey, txHash }
}

export async function publishEvent(
  walletClient: WalletClient,
  entityKey: string,
  data: EventPayload,
  city: string,
  startTime: number,
  hostWallet: `0x${string}`,
): Promise<WriteResult> {
  const expiresIn = Math.floor(secondsUntil(data.endTime) + EXPIRY_BUFFER_SECS.EVENT)
  const startTimeSecs = Math.floor(startTime)

  const safeData = {
    ...data,
    startTime: Math.floor(data.startTime),
    endTime: Math.floor(data.endTime),
  }

  const result = await walletClient.updateEntity({
    entityKey,
    payload: jsonToPayload(safeData),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: ENTITY_TYPE.EVENT },
      { key: 'hostWallet', value: hostWallet },
      { key: 'status', value: 'published' as EventStatus },
      { key: 'city', value: city },
      { key: 'startTime', value: startTimeSecs.toString() },
    ],
    expiresIn,
  })

  return { entityKey: result.entityKey, txHash: result.txHash }
}

export async function listPublishedEvents(options?: {
  city?: string
  hostWallet?: `0x${string}`
}): Promise<ArkivEntity<EventPayload>[]> {
  const predicates = [
    eq('type', ENTITY_TYPE.EVENT),
    eq('status', 'published'),
    ...(options?.city ? [eq('city', options.city)] : []),
    ...(options?.hostWallet ? [eq('hostWallet', options.hostWallet)] : []),
  ]

  const result = await publicClient
    .buildQuery()
    .where(predicates)
    .withAttributes(true)
    .withMetadata(true)
    .withPayload(true)
    .fetch()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.entities.map((e: any) => ({
    entityKey: e.key,
    owner: (e.owner || e.attributes?.find((a: any) => a.key === 'hostWallet')?.value || '') as `0x${string}`,
    payload: e.toJson() as EventPayload,
  }))
}

export async function listHostEvents(
  hostWallet: `0x${string}`,
): Promise<ArkivEntity<EventPayload>[]> {
  // Fetch published + unlisted events for the host in parallel
  const [published, unlisted] = await Promise.all([
    listPublishedEvents({ hostWallet }),
    (async () => {
      const result = await publicClient
        .buildQuery()
        .where([
          eq('type', ENTITY_TYPE.EVENT),
          eq('status', 'unlisted'),
          eq('hostWallet', hostWallet),
        ])
        .withAttributes(true)
        .withMetadata(true)
        .withPayload(true)
        .fetch()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.entities.map((e: any) => ({
        entityKey: e.key,
        owner: (e.owner || e.attributes?.find((a: any) => a.key === 'hostWallet')?.value || '') as `0x${string}`,
        payload: e.toJson() as EventPayload,
      }))
    })(),
  ])

  return [...published, ...unlisted]
}

export async function getEvent(
  entityKey: string,
): Promise<ArkivEntity<EventPayload> | null> {
  try {
    const entity = await publicClient.getEntity(entityKey as `0x${string}`)
    return {
      entityKey: entity.key,
      owner: (entity.owner ?? '') as `0x${string}`,
      payload: entity.toJson() as EventPayload,
    }
  } catch (e) {
    if (e instanceof NoEntityFoundError) return null
    throw e
  }
}
