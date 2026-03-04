// Expiration durations in seconds
export const EXPIRES_IN = {
  PROFILE: 31_536_000,         // 365 days — renews on action
  EVENT_RECORD: 31_536_000,    // 365 days flat — historical tombstone
  // EVENT, RSVP, APPROVAL, CHECKIN: all derived from eventEndTime via EXPIRY_BUFFER_SECS
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
  CHECKIN: 14 * 24 * 60 * 60,  // 14 days — mint POAP within this window
} as const

// Seconds between now and a future unix timestamp (minimum 0).
// Result is always a non-negative EVEN integer because the Arkiv SDK divides
// expiresIn by BLOCK_TIME (2 s) before passing to BigInt — any odd value
// produces a .5 float and throws RangeError.
export function secondsUntil(unixTimestamp: number): number {
  const secs = Math.max(0, Math.floor(unixTimestamp) - Math.floor(Date.now() / 1000))
  // Round UP to the nearest even number so the entity expires at least as long as requested
  return secs % 2 === 0 ? secs : secs + 1
}
