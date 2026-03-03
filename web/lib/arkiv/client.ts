import { createPublicClient, http } from '@arkiv-network/sdk'
import { kaolin } from '@/lib/chains'

// Singleton public client — read-only, no wallet required.
// Used by all entity query functions. Import this, don't recreate it.
export const publicClient = createPublicClient({
  chain: kaolin,
  transport: http(kaolin.rpcUrls.default.http[0]),
})
