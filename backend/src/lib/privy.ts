import { PrivyClient } from '@privy-io/server-auth'
import { logError } from './logger.js'

const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''
const appSecret = process.env.PRIVY_APP_SECRET || ''

if (!appId || !appSecret) {
  console.warn('[privy] PRIVY_APP_ID / PRIVY_APP_SECRET not set — wallet→email resolution will fail')
}

const privy = new PrivyClient(appId, appSecret)

export async function getEmailForWallet(wallet: string): Promise<string | null> {
  try {
    const user = await privy.getUserByWalletAddress(wallet)
    return user?.email?.address ?? null
  } catch (error) {
    logError('privy.getEmailForWallet', error)
    return null
  }
}
