import type { PushSubscription } from 'web-push'

// In-memory store: wallet address -> push subscriptions
// In production, replace with a database
const subscriptions = new Map<string, PushSubscription[]>()

export function addSubscription(wallet: string, subscription: PushSubscription): void {
  const normalized = wallet.toLowerCase()
  const existing = subscriptions.get(normalized) ?? []
  // Avoid duplicates by endpoint
  if (existing.some((s) => s.endpoint === subscription.endpoint)) return
  existing.push(subscription)
  subscriptions.set(normalized, existing)
}

export function removeSubscription(wallet: string, endpoint: string): void {
  const normalized = wallet.toLowerCase()
  const existing = subscriptions.get(normalized) ?? []
  subscriptions.set(
    normalized,
    existing.filter((s) => s.endpoint !== endpoint),
  )
}

export function getSubscriptions(wallet: string): PushSubscription[] {
  return subscriptions.get(wallet.toLowerCase()) ?? []
}
