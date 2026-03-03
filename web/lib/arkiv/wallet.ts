import { createWalletClient, custom } from '@arkiv-network/sdk'
import { kaolin } from '@/lib/chains'
import type { EIP1193Provider } from 'viem'

// Creates an Arkiv WalletClient from a Privy EIP-1193 provider.
// The user's embedded wallet (from Privy) signs all transactions,
// so entities are owned by the user's wallet on-chain.
//
// Usage:
//   const provider = await embeddedWallet.getEthereumProvider()
//   const client = createArkivWallet(provider, embeddedWallet.address)
//   await client.createEntity({ ... })
export function createArkivWallet(
  provider: EIP1193Provider,
  address: `0x${string}`,
) {
  return createWalletClient({
    chain: kaolin,
    transport: custom(provider),
    account: address,
  })
}
