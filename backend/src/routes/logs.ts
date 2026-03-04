import { Router } from 'express'
import { getLogEntries, clearLogs } from '../lib/log-store.js'

export const logsRouter = Router()

// GET /logs?limit=50&offset=0&type=event&action=created
logsRouter.get('/logs', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)
  const offset = parseInt(req.query.offset as string) || 0

  let { entries, total } = getLogEntries(limit, offset)

  const typeFilter = req.query.type as string
  if (typeFilter) {
    entries = entries.filter(e => e.entityType === typeFilter)
    total = entries.length
  }

  const actionFilter = req.query.action as string
  if (actionFilter) {
    entries = entries.filter(e => e.action === actionFilter)
    total = entries.length
  }

  res.json({ entries, total, limit, offset })
})

// DELETE /logs — clear all
logsRouter.delete('/logs', (_req, res) => {
  clearLogs()
  res.json({ status: 'cleared' })
})
