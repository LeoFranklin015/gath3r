"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Check, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CheckinEntity } from "@/lib/arkiv/types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/backend"

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

interface PoapTabProps {
  checkins: CheckinEntity[]
  eventId: string
  eventTitle: string
}

export function PoapTab({ checkins, eventId, eventTitle }: PoapTabProps) {
  // Collection state
  const [poapAddress, setPoapAddress] = useState<string | null>(null)
  const [collectionLoading, setCollectionLoading] = useState(true)
  const [name, setName] = useState(eventTitle)
  const [symbol, setSymbol] = useState(eventTitle.slice(0, 5).toUpperCase().replace(/\s/g, ""))
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Mint state
  const [tokenURI, setTokenURI] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [minted, setMinted] = useState<Set<string>>(new Set())
  const [minting, setMinting] = useState(false)
  const [mintProgress, setMintProgress] = useState({ current: 0, total: 0 })
  const [mintError, setMintError] = useState<string | null>(null)

  // Check if collection exists
  const checkCollection = useCallback(async () => {
    setCollectionLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/poap/event/${eventId}`)
      if (res.ok) {
        const data = await res.json()
        setPoapAddress(data.poapAddress)
        // Mark already-minted attendees
        const mintedSet = new Set<string>()
        for (const token of data.tokens || []) {
          if (token.owner) mintedSet.add(token.owner.toLowerCase())
        }
        setMinted(mintedSet)
      }
    } catch {
      // No collection yet — that's fine
    } finally {
      setCollectionLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    checkCollection()
  }, [checkCollection])

  const handleCreate = async () => {
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/poap/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, symbol, eventId }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setPoapAddress(data.poapAddress)
      } else {
        setCreateError(data.error || "Failed to create collection")
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Network error")
    } finally {
      setCreating(false)
    }
  }

  const toggleSelect = (wallet: string) => {
    const next = new Set(selected)
    if (next.has(wallet)) next.delete(wallet)
    else next.add(wallet)
    setSelected(next)
  }

  const toggleAll = () => {
    const unminted = checkins
      .filter((c) => !minted.has(c.attendeeWallet.toLowerCase()))
      .map((c) => c.attendeeWallet)
    if (selected.size === unminted.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(unminted))
    }
  }

  const handleMint = async () => {
    const wallets = Array.from(selected)
    if (wallets.length === 0 || !tokenURI.trim()) return

    setMinting(true)
    setMintError(null)
    setMintProgress({ current: 0, total: wallets.length })

    for (let i = 0; i < wallets.length; i++) {
      setMintProgress({ current: i + 1, total: wallets.length })
      try {
        const res = await fetch(`${BACKEND_URL}/poap/mint`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, attendee: wallets[i], tokenURI }),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setMinted((prev) => new Set([...prev, wallets[i].toLowerCase()]))
          setSelected((prev) => {
            const next = new Set(prev)
            next.delete(wallets[i])
            return next
          })
        } else if (res.status === 409) {
          // Already minted — mark as minted
          setMinted((prev) => new Set([...prev, wallets[i].toLowerCase()]))
          setSelected((prev) => {
            const next = new Set(prev)
            next.delete(wallets[i])
            return next
          })
        } else {
          setMintError(`Failed for ${short(wallets[i])}: ${data.error}`)
        }
      } catch (e) {
        setMintError(`Network error for ${short(wallets[i])}`)
      }
    }

    setMinting(false)
  }

  if (collectionLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  // Step 1: Create collection
  if (!poapAddress) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Create POAP Collection</p>
              <p className="text-[10px] text-muted-foreground">
                Deploy an NFT collection for this event
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Collection Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ETHDenver 2025 POAP"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Symbol
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. ETHD25"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating || !name.trim() || !symbol.trim()}
              className="w-full rounded-xl"
            >
              {creating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deploying...</>
              ) : (
                "Create Collection"
              )}
            </Button>
            {createError && (
              <p className="text-xs text-destructive">{createError}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Mint POAPs
  const unminted = checkins.filter((c) => !minted.has(c.attendeeWallet.toLowerCase()))

  return (
    <div className="flex flex-col gap-4">
      {/* Collection info */}
      <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
        <p className="text-sm font-medium text-foreground">POAP Collection</p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {short(poapAddress)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {minted.size} minted / {checkins.length} checked in
        </p>
      </div>

      {/* Token URI */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Token URI (IPFS)
        </label>
        <input
          type="text"
          value={tokenURI}
          onChange={(e) => setTokenURI(e.target.value)}
          placeholder="ipfs://..."
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
        />
      </div>

      {/* Attendee list */}
      {checkins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-sm text-muted-foreground">No checked-in attendees yet</p>
        </div>
      ) : (
        <>
          {/* Select all */}
          {unminted.length > 0 && (
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-xs font-medium text-primary"
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  selected.size === unminted.length
                    ? "border-primary bg-primary text-white"
                    : "border-border"
                }`}
              >
                {selected.size === unminted.length && <Check className="h-2.5 w-2.5" />}
              </div>
              Select all ({unminted.length})
            </button>
          )}

          <div className="overflow-hidden rounded-2xl border border-border">
            {checkins.map((c, i) => {
              const wallet = c.attendeeWallet
              const isMinted = minted.has(wallet.toLowerCase())
              const isSelected = selected.has(wallet)

              return (
                <div
                  key={wallet}
                  className={`flex items-center gap-3 bg-card px-4 py-3 ${
                    i < checkins.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  {isMinted ? (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleSelect(wallet)}
                      className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5" />}
                    </button>
                  )}
                  <span className="font-mono text-xs text-foreground">{short(wallet)}</span>
                  {isMinted && (
                    <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                      Minted
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Mint button */}
          <Button
            onClick={handleMint}
            disabled={minting || selected.size === 0 || !tokenURI.trim()}
            size="lg"
            className="w-full rounded-2xl py-6 text-base font-semibold shadow-md shadow-primary/20"
          >
            {minting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting {mintProgress.current}/{mintProgress.total}...
              </>
            ) : (
              <>
                <Award className="mr-2 h-5 w-5" />
                Mint POAP ({selected.size})
              </>
            )}
          </Button>

          {mintError && (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
              {mintError}
            </p>
          )}
        </>
      )}
    </div>
  )
}
