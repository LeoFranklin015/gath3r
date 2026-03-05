"use client"

import { useState, useEffect, useCallback } from "react"
import { createPublicClient, http, formatEther } from "viem"
import { kaolin } from "@/lib/chains"
import { Button } from "@/components/ui/button"
import { ExternalLink, RefreshCw, Wallet, Check, Copy } from "lucide-react"

const FAUCET_URL = "https://kaolin.hoodi.arkiv.network/faucet/"
const MIN_BALANCE = BigInt("1000000000000000") // 0.003 ETH in wei

const viemClient = createPublicClient({
  chain: kaolin,
  transport: http(kaolin.rpcUrls.default.http[0]),
})

interface FundStepProps {
  address: string
  onNext: () => void
}

export function FundStep({ address, onNext }: FundStepProps) {
  const [balance, setBalance] = useState<bigint | null>(null)
  const [checking, setChecking] = useState(true)

  const funded = balance !== null && balance >= MIN_BALANCE

  const checkBalance = useCallback(async () => {
    if (!address) return
    setChecking(true)
    try {
      const bal = await viemClient.getBalance({ address: address as `0x${string}` })
      setBalance(bal)
    } catch (e) {
      console.error("Balance check failed:", e)
    } finally {
      setChecking(false)
    }
  }, [address])

  useEffect(() => {
    checkBalance()
  }, [checkBalance])

  // Auto-poll every 5s while not funded
  useEffect(() => {
    if (funded) return
    const id = setInterval(checkBalance, 5_000)
    return () => clearInterval(id)
  }, [funded, checkBalance])

  const displayBalance = balance !== null ? formatEther(balance) : "..."

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 pt-10">

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-foreground">Fund your wallet</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You need a small amount of testnet ETH to create your profile on-chain.
          Grab some from the faucet — it&apos;s free!
        </p>
      </div>

      {/* Balance card */}
      <div className="w-full rounded-2xl border border-border bg-card px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            Balance
          </span>
          <button
            onClick={checkBalance}
            disabled={checking}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
          {displayBalance} <span className="text-sm font-normal text-muted-foreground">ETH</span>
        </p>
        {!funded && balance !== null && (
          <p className="mt-1 text-xs text-amber-600">
            Minimum 0.001 ETH required
          </p>
        )}
        {funded && (
          <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            Sufficient balance
          </p>
        )}
      </div>

      {/* Faucet link */}
      {!funded && (
        <a
          href={FAUCET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <ExternalLink className="h-4 w-4" />
          Open Faucet
        </a>
      )}

      {/* Wallet address (so user can copy for faucet) */}
      {!funded && address && (
        <CopyAddress address={address} />
      )}

      {/* Continue */}
      <Button
        onClick={onNext}
        disabled={!funded}
        size="lg"
        className="w-full rounded-2xl py-6 text-base font-semibold"
      >
        {funded ? "Continue" : "Waiting for funds..."}
      </Button>
    </div>
  )
}

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground/60">Your wallet address</span>
      <button
        onClick={copy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground break-all transition-colors hover:bg-muted"
      >
        <span className="min-w-0">{address}</span>
        {copied
          ? <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
          : <Copy className="h-3.5 w-3.5 shrink-0" />
        }
      </button>
    </div>
  )
}
