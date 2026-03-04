import { defineChain } from 'viem'

export const arbitrumSepolia = defineChain({
  id: 421614,
  name: 'Arbitrum Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.ARB_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc'],
    },
  },
  testnet: true,
})

export const POAP_FACTORY_ADDRESS = process.env.POAP_FACTORY_ADDRESS as `0x${string}`
export const POAP_DEPLOYER_KEY = process.env.POAP_DEPLOYER_PRIVATE_KEY as `0x${string}`
