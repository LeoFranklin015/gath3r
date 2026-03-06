export const ENTITY_TYPE = {
  PROFILE: 'profile',
  EVENT: 'gather-events',
  RSVP: 'rsvp',
  EVENT_RECORD: 'event_record',
  CHECKIN: 'checkin',
  APPROVAL: 'approval',
} as const

export type EntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE]
