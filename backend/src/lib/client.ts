import { createPublicClient, http } from '@arkiv-network/sdk'
import { kaolin } from '../config/chain.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const publicClient: any = createPublicClient({
  chain: kaolin,
  transport: http(kaolin.rpcUrls.default.http[0]),
})
