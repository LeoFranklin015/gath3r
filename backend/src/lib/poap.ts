import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia, POAP_FACTORY_ADDRESS, POAP_DEPLOYER_KEY } from '../config/arbitrum.js'
import { POAPFactoryABI, EventPOAPABI } from '../config/abis.js'
import { logInfo, logError } from './logger.js'

// ──────────────── Clients ────────────────

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
})

function getWalletClient() {
  if (!POAP_DEPLOYER_KEY) throw new Error('POAP_DEPLOYER_PRIVATE_KEY not set')
  const account = privateKeyToAccount(POAP_DEPLOYER_KEY)
  return createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(),
  })
}

// ──────────────── Create Event POAP ────────────────

export async function createEventPOAP(
  name: string,
  symbol: string,
  eventId: string,
): Promise<{ poapAddress: Address; txHash: Hex }> {
  const wallet = getWalletClient()

  const txHash = await wallet.writeContract({
    address: POAP_FACTORY_ADDRESS,
    abi: POAPFactoryABI,
    functionName: 'createEventPOAP',
    args: [name, symbol, eventId],
  })

  await publicClient.waitForTransactionReceipt({ hash: txHash })

  const poapAddress = await publicClient.readContract({
    address: POAP_FACTORY_ADDRESS,
    abi: POAPFactoryABI,
    functionName: 'getEventPOAP',
    args: [eventId],
  })

  logInfo(`EventPOAP created: ${poapAddress} for event "${eventId}"`)
  return { poapAddress: poapAddress as Address, txHash }
}

// ──────────────── Host Mint (backend pays gas) ────────────────

export async function hostMint(
  poapAddress: Address,
  attendee: Address,
  tokenURI: string,
): Promise<{ txHash: Hex }> {
  const wallet = getWalletClient()

  const txHash = await wallet.writeContract({
    address: poapAddress,
    abi: EventPOAPABI,
    functionName: 'hostMint',
    args: [attendee, tokenURI],
  })

  await publicClient.waitForTransactionReceipt({ hash: txHash })
  logInfo(`POAP minted to ${attendee} on ${poapAddress}`)
  return { txHash }
}

// ──────────────── Get Event POAP Address ────────────────

export async function getEventPOAPAddress(eventId: string): Promise<Address> {
  const addr = await publicClient.readContract({
    address: POAP_FACTORY_ADDRESS,
    abi: POAPFactoryABI,
    functionName: 'getEventPOAP',
    args: [eventId],
  })
  return addr as Address
}

// ──────────────── List All NFTs for an Event ────────────────

export interface POAPToken {
  tokenId: number
  owner: Address
  tokenURI: string
}

export async function listEventPOAPs(poapAddress: Address): Promise<POAPToken[]> {
  const totalSupply = await publicClient.readContract({
    address: poapAddress,
    abi: EventPOAPABI,
    functionName: 'totalSupply',
  }) as bigint

  const tokens: POAPToken[] = []

  for (let i = 1; i <= Number(totalSupply); i++) {
    const [owner, tokenURI] = await Promise.all([
      publicClient.readContract({
        address: poapAddress,
        abi: EventPOAPABI,
        functionName: 'ownerOf',
        args: [BigInt(i)],
      }),
      publicClient.readContract({
        address: poapAddress,
        abi: EventPOAPABI,
        functionName: 'tokenURI',
        args: [BigInt(i)],
      }),
    ])

    tokens.push({
      tokenId: i,
      owner: owner as Address,
      tokenURI: tokenURI as string,
    })
  }

  return tokens
}

// ──────────────── Get Total Events ────────────────

export async function getTotalEvents(): Promise<number> {
  const total = await publicClient.readContract({
    address: POAP_FACTORY_ADDRESS,
    abi: POAPFactoryABI,
    functionName: 'totalEvents',
  })
  return Number(total)
}

// ──────────────── Check if Attendee Has Minted ────────────────

export async function hasMinted(poapAddress: Address, attendee: Address): Promise<boolean> {
  return publicClient.readContract({
    address: poapAddress,
    abi: EventPOAPABI,
    functionName: 'hasMinted',
    args: [attendee],
  }) as Promise<boolean>
}
