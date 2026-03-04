// Social links
export type SocialPlatform = 'twitter' | 'instagram' | 'github' | 'website'

export interface SocialLink {
  platform: SocialPlatform
  url: string
}

// Raw entity payloads — stored as JSON in Arkiv
export interface ProfilePayload {
  displayName: string
  bio: string
  avatar: string         // IPFS URL
  socialLinks: SocialLink[]
  eventsHosted: number
  eventsAttended: number
  showUpRate: number     // 0-1 float
}

export interface EventPayload {
  title: string
  description: string
  location: string       // full address
  startTime: number      // unix timestamp
  endTime: number        // unix timestamp
  maxCapacity: number    // 0 = unlimited
  requiresApproval: boolean
  tags: string[]
  imageUrl: string
  ticketPrice: number    // ETH amount, 0 = free
}

export interface RsvpPayload {
  message: string
  createdAt: number      // unix timestamp
}

export interface EventRecordPayload {
  eventName: string      // snapshot of title at time of creation
  hostName: string       // snapshot of host displayName
  eventTxHash: string    // tx that created the Event entity
  eventDate: number      // unix timestamp snapshot
}

export interface CheckinPayload {
  checkedInAt: number    // unix timestamp
  proof: string          // QR hash or geo coordinates
}

export interface ApprovalPayload {
  reason: string
  decidedAt: number      // unix timestamp
}

// Returned from Arkiv queries — entityKey is the on-chain identifier
export interface ArkivEntity<T> {
  entityKey: string
  owner: `0x${string}`
  payload: T
  expiresAt?: number
}

// Result of a write operation
export interface WriteResult {
  entityKey: string
  txHash: string
}

// Status/method union types
export type RsvpStatus = 'pending' | 'confirmed' | 'waitlisted' | 'cancelled'
export type EventStatus = 'draft' | 'published' | 'cancelled'
export type ApprovalDecision = 'approved' | 'rejected' | 'waitlisted'
export type CheckinMethod = 'qr' | 'nfc' | 'manual'

// Extended entity types with on-chain attributes extracted
export interface RsvpEntity extends ArkivEntity<RsvpPayload> {
  attendeeWallet: `0x${string}`
  status: RsvpStatus
}

export interface ApprovalEntity extends ArkivEntity<ApprovalPayload> {
  attendeeWallet: `0x${string}`
  decision: ApprovalDecision
}
