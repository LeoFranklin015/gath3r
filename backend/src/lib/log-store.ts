import type { ActivityLogEntry } from '../types.js'

const MAX_ENTRIES = 500
let nextId = 1
const entries: ActivityLogEntry[] = []

export function addLogEntry(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): ActivityLogEntry {
  const full: ActivityLogEntry = {
    ...entry,
    id: nextId++,
    timestamp: new Date().toISOString(),
  }
  entries.unshift(full)
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES
  return full
}

export function getLogEntries(limit = 50, offset = 0): { entries: ActivityLogEntry[]; total: number } {
  return { entries: entries.slice(offset, offset + limit), total: entries.length }
}

export function clearLogs(): void {
  entries.length = 0
}
