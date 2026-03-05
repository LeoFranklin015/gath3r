import type { Hex } from 'viem'
import { NoEntityFoundError } from '@arkiv-network/sdk'
import { publicClient } from './client.js'
import { parseEntity } from './entity-parser.js'
import { addLogEntry } from './log-store.js'
import { logEntityEvent, logError, logInfo } from './logger.js'
import { sendApprovalEmail } from './approval-email.js'
import { sendRsvpEmail } from './rsvp-email.js'
import { sendCheckinEmail } from './checkin-email.js'
import type { EventAction } from '../types.js'

async function handleApprovalNotification(entity: any, details: Record<string, unknown>): Promise<void> {
  const decision = details.decision as string | undefined
  const attendeeWallet = details.attendeeWallet as string | undefined
  const eventId = details.eventId as string | undefined

  if (decision !== 'approved' || !attendeeWallet || !eventId) return

  try {
    // Fetch the event entity to get the event title
    const eventEntity = await publicClient.getEntity(eventId as Hex)
    let eventTitle = '(untitled event)'
    try {
      const eventPayload = eventEntity.toJson() as Record<string, unknown>
      eventTitle = (eventPayload.title as string) || eventTitle
    } catch {
      // payload might not be JSON
    }

    sendApprovalEmail(attendeeWallet, eventTitle).catch((err) =>
      logError('approval-email-async', err),
    )
  } catch (error) {
    logError('approval-notification', error)
  }
}

async function handleRsvpNotification(details: Record<string, unknown>): Promise<void> {
  const attendeeWallet = details.attendeeWallet as string | undefined
  const eventId = details.eventId as string | undefined
  const status = details.status as string | undefined

  if (!attendeeWallet || !eventId || !status) return

  try {
    const eventEntity = await publicClient.getEntity(eventId as Hex)
    let eventTitle = '(untitled event)'
    try {
      const eventPayload = eventEntity.toJson() as Record<string, unknown>
      eventTitle = (eventPayload.title as string) || eventTitle
    } catch {
      // payload might not be JSON
    }

    sendRsvpEmail(attendeeWallet, eventTitle, status).catch((err) =>
      logError('rsvp-email-async', err),
    )
  } catch (error) {
    logError('rsvp-notification', error)
  }
}

async function handleCheckinNotification(details: Record<string, unknown>): Promise<void> {
  const attendeeWallet = details.attendeeWallet as string | undefined
  const eventId = details.eventId as string | undefined
  const method = (details.method as string) || 'unknown'

  if (!attendeeWallet || !eventId) return

  try {
    const eventEntity = await publicClient.getEntity(eventId as Hex)
    let eventTitle = '(untitled event)'
    try {
      const eventPayload = eventEntity.toJson() as Record<string, unknown>
      eventTitle = (eventPayload.title as string) || eventTitle
    } catch {
      // payload might not be JSON
    }

    sendCheckinEmail(attendeeWallet, eventTitle, method).catch((err) =>
      logError('checkin-email-async', err),
    )
  } catch (error) {
    logError('checkin-notification', error)
  }
}

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

    // Send notification emails when entities are created
    if (action === 'created') {
      if (parsed.entityType === 'approval') {
        await handleApprovalNotification(entity, parsed.details)
      } else if (parsed.entityType === 'rsvp') {
        await handleRsvpNotification(parsed.details)
      } else if (parsed.entityType === 'checkin') {
        await handleCheckinNotification(parsed.details)
      }
    }
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
