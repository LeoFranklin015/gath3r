'use client'

import { useCallback } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { createArkivWallet } from '@/lib/arkiv/wallet'
import { kaolin } from '@/lib/chains'

// Hook that bridges the Privy embedded wallet to an Arkiv WalletClient.
// Returns getClient() — call it inside async handlers, not during render.
export function useArkivWallet() {
  const { wallets } = useWallets()
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')

  const getProvider = useCallback(async () => {
    if (!embeddedWallet) throw new Error('No embedded wallet found. Please log in.')
    await embeddedWallet.switchChain(kaolin.id)
    return embeddedWallet.getEthereumProvider()
  }, [embeddedWallet])

  const getClient = useCallback(async () => {
    if (!embeddedWallet) throw new Error('No embedded wallet found. Please log in.')
    // Ensure the embedded wallet is on Kaolin before transacting
    await embeddedWallet.switchChain(kaolin.id)
    const provider = await embeddedWallet.getEthereumProvider()
    return createArkivWallet(
      provider as Parameters<typeof createArkivWallet>[0],
      embeddedWallet.address as `0x${string}`,
    )
  }, [embeddedWallet])

  return {
    getClient,
    getProvider,
    address: embeddedWallet?.address as `0x${string}` | undefined,
    ready: !!embeddedWallet,
  }
}
