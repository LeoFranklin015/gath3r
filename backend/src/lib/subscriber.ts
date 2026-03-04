import type { Hex } from 'viem'
import { NoEntityFoundError } from '@arkiv-network/sdk'
import { publicClient } from './client.js'
import { parseEntity } from './entity-parser.js'
import { addLogEntry } from './log-store.js'
import { logEntityEvent, logError, logInfo } from './logger.js'
import type { EventAction } from '../types.js'

async function handleEntityEvent(entityKey: Hex, owner: Hex, action: EventAction): Promise<void> {
  try {
    const entity = await publicClient.getEntity(entityKey)
    const parsed = parseEntity(entity, action)

    logEntityEvent(action, parsed.entityType, parsed.summary, parsed.details)

    addLogEntry({
      action,
      entityKey,
      owner: (entity.owner as Hex) ?? owner,
      entityType: parsed.entityType,
      summary: parsed.summary,
      details: parsed.details,
    })
  } catch (error) {
    if (error instanceof NoEntityFoundError) {
      const summary = `Entity ${short(entityKey)} by ${short(owner)} (${action} — no longer exists)`
      logError('entityEvent', `NoEntityFoundError for ${short(entityKey)} (${action})`)
      addLogEntry({ action, entityKey, owner, entityType: 'unknown', summary, details: {}, error: 'Entity not found' })
    } else {
      logError('entityEvent', error)
      addLogEntry({
        action,
        entityKey,
        owner,
        entityType: 'unknown',
        summary: `Failed to fetch ${short(entityKey)}`,
        details: {},
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

function short(hex: string): string {
  return hex.length > 12 ? `${hex.slice(0, 6)}...${hex.slice(-4)}` : hex
}

export async function startSubscription(): Promise<() => void> {
  logInfo('Starting entity event subscription on Kaolin...')

  const unsubscribe = await publicClient.subscribeEntityEvents(
    {
      onError: (error: Error) => {
        logError('subscribeEntityEvents', error)
      },
      onEntityCreated: (event: { entityKey: Hex; owner: Hex }) => {
        handleEntityEvent(event.entityKey, event.owner, 'created')
      },
      onEntityUpdated: (event: { entityKey: Hex; owner: Hex }) => {
        handleEntityEvent(event.entityKey, event.owner, 'updated')
      },
      onEntityDeleted: (event: { entityKey: Hex; owner: Hex }) => {
        handleEntityEvent(event.entityKey, event.owner, 'deleted')
      },
      onEntityExpired: (event: { entityKey: Hex; owner: Hex }) => {
        handleEntityEvent(event.entityKey, event.owner, 'expired')
      },
      onEntityExpiresInExtended: (event: { entityKey: Hex; owner: Hex }) => {
        handleEntityEvent(event.entityKey, event.owner, 'ttl_extended')
      },
    },
    2000,
  )

  logInfo('Subscription active — listening for entity events...')
  return unsubscribe
}
