import type { Hex } from 'viem'
import type { EntityType } from './config/constants.js'

export type EventAction = 'created' | 'updated' | 'deleted' | 'expired' | 'ttl_extended'

export interface ActivityLogEntry {
  id: number
  timestamp: string
  action: EventAction
  entityKey: Hex
  owner: Hex
  entityType: EntityType | 'unknown'
  summary: string
  details: Record<string, unknown>
  error?: string
}
