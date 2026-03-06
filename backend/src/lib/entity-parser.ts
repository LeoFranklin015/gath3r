import { ENTITY_TYPE, type EntityType } from '../config/constants.js'

interface Attribute {
  key: string
  value: string | number
}

function attr(attributes: Attribute[], key: string): string {
  const v = attributes.find(a => a.key === key)?.value
  return v != null ? String(v) : ''
}

function short(addr: string): string {
  if (!addr || addr.length < 10) return addr || '(none)'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function fmtTime(ts: unknown): string {
  const num = typeof ts === 'string' ? parseInt(ts, 10) : typeof ts === 'number' ? ts : 0
  if (!num) return ''
  return new Date(num * 1000).toISOString()
}

export function detectEntityType(attributes: Attribute[]): EntityType | 'unknown' {
  const t = attr(attributes, 'type')
  const valid = Object.values(ENTITY_TYPE) as string[]
  return valid.includes(t) ? (t as EntityType) : 'unknown'
}

export interface ParsedEntity {
  entityType: EntityType | 'unknown'
  summary: string
  details: Record<string, unknown>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEntity(entity: any, action: string): ParsedEntity {
  const attributes: Attribute[] = entity.attributes ?? []
  const entityType = detectEntityType(attributes)

  let payload: Record<string, unknown> = {}
  try {
    payload = entity.toJson() ?? {}
  } catch {
    // payload might not be JSON
  }

  switch (entityType) {
    case 'gather-events': {
      const host = attr(attributes, 'hostWallet')
      const status = attr(attributes, 'status')
      const city = attr(attributes, 'city')
      return {
        entityType,
        summary: `"${payload.title ?? '(untitled)'}" by ${short(host)} [${status}] in ${city || '?'}`,
        details: {
          title: payload.title,
          status,
          city,
          hostWallet: host,
          startTime: fmtTime(payload.startTime),
          endTime: fmtTime(payload.endTime),
          maxCapacity: payload.maxCapacity,
          requiresApproval: payload.requiresApproval,
        },
      }
    }

    case 'rsvp': {
      const eventId = attr(attributes, 'eventId')
      const attendee = attr(attributes, 'attendeeWallet')
      const status = attr(attributes, 'status')
      return {
        entityType,
        summary: `${short(attendee)} -> event ${short(eventId)} [${status}]`,
        details: { eventId, attendeeWallet: attendee, status, message: payload.message },
      }
    }

    case 'approval': {
      const eventId = attr(attributes, 'eventId')
      const attendee = attr(attributes, 'attendeeWallet')
      const host = attr(attributes, 'hostWallet')
      const decision = attr(attributes, 'decision')
      return {
        entityType,
        summary: `${short(host)} ${decision} ${short(attendee)} for event ${short(eventId)}`,
        details: { eventId, attendeeWallet: attendee, hostWallet: host, decision, reason: payload.reason },
      }
    }

    case 'checkin': {
      const eventId = attr(attributes, 'eventId')
      const attendee = attr(attributes, 'attendeeWallet')
      const method = attr(attributes, 'method')
      return {
        entityType,
        summary: `${short(attendee)} at event ${short(eventId)} via ${method}`,
        details: { eventId, attendeeWallet: attendee, method, checkedInAt: fmtTime(payload.checkedInAt) },
      }
    }

    case 'profile': {
      const wallet = attr(attributes, 'wallet')
      return {
        entityType,
        summary: `"${payload.displayName ?? '(no name)'}" (${short(wallet)})`,
        details: { wallet, displayName: payload.displayName, bio: payload.bio },
      }
    }

    case 'event_record': {
      const eventRefId = attr(attributes, 'eventRefId')
      const host = attr(attributes, 'hostWallet')
      return {
        entityType,
        summary: `"${payload.eventName ?? '(no name)'}" by ${short(host)}`,
        details: { eventRefId, hostWallet: host, eventName: payload.eventName },
      }
    }

    default:
      return {
        entityType: 'unknown',
        summary: `entity ${short(entity.key)} owned by ${short(entity.owner ?? '')}`,
        details: { payload },
      }
  }
}
