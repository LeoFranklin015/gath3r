import { Router } from 'express'
import { addSubscription, getSubscriptions } from '../lib/push-store.js'
import { sendPushToWallet } from '../lib/push.js'
import { logInfo } from '../lib/logger.js'

export const pushRouter = Router()

// POST /push/subscribe — register a push subscription for a wallet
pushRouter.post('/push/subscribe', (req, res) => {
  const { wallet, subscription } = req.body

  if (!wallet || !subscription?.endpoint) {
    res.status(400).json({ error: 'wallet and subscription required' })
    return
  }

  addSubscription(wallet, subscription)
  logInfo(`[push] Registered subscription for ${wallet}`)
  res.json({ ok: true })
})

// GET /push/vapid-key — return the public VAPID key for the frontend
pushRouter.get('/push/vapid-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || ''
  res.json({ publicKey: key })
})

// POST /push/test — send a test notification to a wallet (dev only)
pushRouter.post('/push/test', async (req, res) => {
  const { wallet } = req.body
  if (!wallet) {
    res.status(400).json({ error: 'wallet required' })
    return
  }

  const subs = getSubscriptions(wallet)
  logInfo(`[push-test] Wallet ${wallet} has ${subs.length} subscription(s)`)

  if (subs.length === 0) {
    res.json({ ok: false, message: 'No subscriptions found for this wallet', subscriptions: 0 })
    return
  }

  await sendPushToWallet(wallet, {
    title: 'Gath3r Test',
    body: 'Push notifications are working!',
    url: '/home',
  })

  res.json({ ok: true, subscriptions: subs.length })
})
