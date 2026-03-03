// Expiration durations in seconds
export const EXPIRES_IN = {
  PROFILE: 31_536_000,         // 365 days — renews on action
  EVENT_RECORD: 31_536_000,    // 365 days flat — historical tombstone
  CHECKIN: 604_800,            // 7 days — POAP minting window
  // EVENT, RSVP, APPROVAL: calculated dynamically from eventEndTime
} as const

// Entity type discriminants — used as queryable attributes
export const ENTITY_TYPE = {
  PROFILE: 'profile',
  EVENT: 'event',
  RSVP: 'rsvp',
  EVENT_RECORD: 'event_record',
  CHECKIN: 'checkin',
  APPROVAL: 'approval',
} as const

// Dynamic expiry buffers — single source of truth for the no-orphan guarantee.
// Import from here; never redefine locally in entity files or hooks.
export const EXPIRY_BUFFER_SECS = {
  EVENT: 90 * 24 * 60 * 60,    // 90 days after event end
  APPROVAL: 14 * 24 * 60 * 60, // 14 days after event end
} as const

// Seconds between now and a future unix timestamp (minimum 0)
export function secondsUntil(unixTimestamp: number): number {
  return Math.max(0, unixTimestamp - Math.floor(Date.now() / 1000))
}
