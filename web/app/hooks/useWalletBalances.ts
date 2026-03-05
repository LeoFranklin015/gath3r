"use client"

import { useState, useEffect, useCallback } from "react"
import { createPublicClient, http, formatEther } from "viem"
import { kaolin, arbitrumSepolia } from "@/lib/chains"

const kaolinClient = createPublicClient({
  chain: kaolin,
  transport: http(kaolin.rpcUrls.default.http[0]),
})

const arbSepoliaClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(arbitrumSepolia.rpcUrls.default.http[0]),
})

export function useWalletBalances(address: string) {
  const [arkivBalance, setArkivBalance] = useState<bigint | null>(null)
  const [arbBalance, setArbBalance] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!address) return
    setLoading(true)
    try {
      const addr = address as `0x${string}`
      const [kaoBal, arbBal] = await Promise.all([
        kaolinClient.getBalance({ address: addr }),
        arbSepoliaClient.getBalance({ address: addr }),
      ])
      setArkivBalance(kaoBal)
      setArbBalance(arbBal)
    } catch (e) {
      console.error("Balance fetch failed:", e)
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    arkivBalance: arkivBalance !== null ? formatEther(arkivBalance) : null,
    arbBalance: arbBalance !== null ? formatEther(arbBalance) : null,
    loading,
    refresh,
  }
}
