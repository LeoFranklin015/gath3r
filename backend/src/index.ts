import 'dotenv/config'
import express from 'express'
import { healthRouter } from './routes/health.js'
import { logsRouter } from './routes/logs.js'
import { emailRouter } from './routes/email.js'
import { poapRouter } from './routes/poap.js'
import { startSubscription } from './lib/subscriber.js'
import { logInfo, logError } from './lib/logger.js'

const PORT = parseInt(process.env.PORT || '3001', 10)

const app = express()
app.use(express.json())

// CORS for dev (frontend at :3000)
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.use(healthRouter)
app.use(logsRouter)
app.use(emailRouter)
app.use(poapRouter)

let unsubscribe: (() => void) | null = null

app.listen(PORT, async () => {
  logInfo(`Gath3r backend listening on http://localhost:${PORT}`)
  logInfo(`  GET  /health`)
  logInfo(`  GET  /logs?limit=50&type=event&action=created`)
  logInfo(`  POST /poap/create, /poap/mint`)
  logInfo(`  GET  /poap/event/:eventId, /poap/check/:eventId/:attendee`)

  try {
    unsubscribe = await startSubscription()
  } catch (error) {
    logError('startSubscription', error)
    process.exit(1)
  }
})

function shutdown() {
  logInfo('Shutting down...')
  if (unsubscribe) unsubscribe()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
