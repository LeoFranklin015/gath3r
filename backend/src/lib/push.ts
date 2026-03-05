import webPush from 'web-push'
import { getSubscriptions, removeSubscription } from './push-store.js'
import { logInfo, logError } from './logger.js'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@gath3r.app'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
} else {
  console.warn('[push] VAPID keys not set — push notifications disabled')
}

interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushToWallet(wallet: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const subs = getSubscriptions(wallet)
  if (subs.length === 0) {
    logInfo(`[push] No subscriptions for ${wallet} — skipping`)
    return
  }

  const data = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(sub, data)
        logInfo(`[push] Sent to ${wallet}: "${payload.title}"`)
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or invalid — remove it
          removeSubscription(wallet, sub.endpoint)
          logInfo(`[push] Removed stale subscription for ${wallet}`)
        } else {
          logError('push-send', error)
        }
      }
    }),
  )
}
