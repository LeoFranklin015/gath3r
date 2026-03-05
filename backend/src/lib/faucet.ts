import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia, POAP_DEPLOYER_KEY } from '../config/arbitrum.js'
import { logInfo, logError } from './logger.js'

const FAUCET_AMOUNT = parseEther('0.01')

const account = privateKeyToAccount(POAP_DEPLOYER_KEY)

const walletClient = createWalletClient({
  account,
  chain: arbitrumSepolia,
  transport: http(),
})

export async function sendWelcomeEth(toAddress: `0x${string}`): Promise<void> {
  try {
    const hash = await walletClient.sendTransaction({
      to: toAddress,
      value: FAUCET_AMOUNT,
    })
    logInfo(`Sent 0.01 ETH to ${toAddress} on Arb Sepolia — tx: ${hash}`)
  } catch (error) {
    logError('faucet-send', error)
  }
}
