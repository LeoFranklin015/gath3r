import { Router } from 'express'
import type { Address } from 'viem'
import {
  createEventPOAP,
  hostMint,
  getEventPOAPAddress,
  listEventPOAPs,
  getTotalEvents,
  hasMinted,
} from '../lib/poap.js'

export const poapRouter = Router()

// POST /poap/create — Create a new EventPOAP collection for an event
// Body: { name: string, symbol: string, eventId: string }
poapRouter.post('/poap/create', async (req, res) => {
  const { name, symbol, eventId } = req.body ?? {}

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: '"name" is required (e.g. "ETHDenver 2025 POAP")' })
    return
  }
  if (!symbol || typeof symbol !== 'string') {
    res.status(400).json({ error: '"symbol" is required (e.g. "ETHD25")' })
    return
  }
  if (!eventId || typeof eventId !== 'string') {
    res.status(400).json({ error: '"eventId" is required (Arkiv entity key)' })
    return
  }

  try {
    const result = await createEventPOAP(name, symbol, eventId)
    res.json({ success: true, ...result })
  } catch (error: any) {
    const msg = error?.shortMessage || error?.message || String(error)
    res.status(500).json({ error: msg })
  }
})

// POST /poap/mint — Mint a POAP to an attendee (backend pays gas)
// Body: { eventId: string, attendee: string, tokenURI: string }
poapRouter.post('/poap/mint', async (req, res) => {
  const { eventId, attendee, tokenURI } = req.body ?? {}

  if (!eventId || typeof eventId !== 'string') {
    res.status(400).json({ error: '"eventId" is required' })
    return
  }
  if (!attendee || typeof attendee !== 'string') {
    res.status(400).json({ error: '"attendee" address is required' })
    return
  }
  if (!tokenURI || typeof tokenURI !== 'string') {
    res.status(400).json({ error: '"tokenURI" is required (IPFS URI)' })
    return
  }

  try {
    const poapAddress = await getEventPOAPAddress(eventId)
    if (poapAddress === '0x0000000000000000000000000000000000000000') {
      res.status(404).json({ error: `No POAP collection found for event "${eventId}"` })
      return
    }

    const alreadyMinted = await hasMinted(poapAddress, attendee as Address)
    if (alreadyMinted) {
      res.status(409).json({ error: `Attendee ${attendee} already minted for this event` })
      return
    }

    const result = await hostMint(poapAddress, attendee as Address, tokenURI)
    res.json({ success: true, poapAddress, ...result })
  } catch (error: any) {
    const msg = error?.shortMessage || error?.message || String(error)
    res.status(500).json({ error: msg })
  }
})

// GET /poap/event/:eventId — Get POAP contract info and all minted tokens
poapRouter.get('/poap/event/:eventId', async (req, res) => {
  const { eventId } = req.params

  try {
    const poapAddress = await getEventPOAPAddress(eventId)
    if (poapAddress === '0x0000000000000000000000000000000000000000') {
      res.status(404).json({ error: `No POAP collection found for event "${eventId}"` })
      return
    }

    const tokens = await listEventPOAPs(poapAddress)
    res.json({ poapAddress, eventId, totalMinted: tokens.length, tokens })
  } catch (error: any) {
    const msg = error?.shortMessage || error?.message || String(error)
    res.status(500).json({ error: msg })
  }
})

// GET /poap/check/:eventId/:attendee — Check if attendee already minted
poapRouter.get('/poap/check/:eventId/:attendee', async (req, res) => {
  const { eventId, attendee } = req.params

  try {
    const poapAddress = await getEventPOAPAddress(eventId)
    if (poapAddress === '0x0000000000000000000000000000000000000000') {
      res.status(404).json({ error: `No POAP collection found for event "${eventId}"` })
      return
    }

    const minted = await hasMinted(poapAddress, attendee as Address)
    res.json({ eventId, attendee, hasMinted: minted, poapAddress })
  } catch (error: any) {
    const msg = error?.shortMessage || error?.message || String(error)
    res.status(500).json({ error: msg })
  }
})

// GET /poap/stats — Get total number of POAP collections created
poapRouter.get('/poap/stats', async (_req, res) => {
  try {
    const totalEvents = await getTotalEvents()
    res.json({ totalEvents })
  } catch (error: any) {
    const msg = error?.shortMessage || error?.message || String(error)
    res.status(500).json({ error: msg })
  }
})
