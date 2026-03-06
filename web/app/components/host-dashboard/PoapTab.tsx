"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Loader2, Check, Award, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ENSName } from "@/app/components/ENSName"
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
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload-avatar", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error || "Upload failed")
        return
      }
      setTokenURI(`ipfs://${data.cid}`)
      setImagePreview(data.url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

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
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
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
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
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

      {/* POAP Image Upload */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <label className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          POAP Image
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
          }}
        />
        {imagePreview ? (
          <div className="flex items-center gap-3">
            <img
              src={imagePreview}
              alt="POAP"
              className="h-16 w-16 shrink-0 rounded-xl object-cover border border-border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">Uploaded</p>
              <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{tokenURI}</p>
            </div>
            <button
              onClick={() => {
                setTokenURI("")
                setImagePreview(null)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border hover:bg-muted active:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-muted-foreground hover:border-primary/50 hover:text-primary active:bg-primary/5 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
            <span className="text-sm font-medium">
              {uploading ? "Uploading to IPFS..." : "Tap to upload POAP image"}
            </span>
            <span className="text-xs text-muted-foreground/70">PNG, JPEG, GIF, WebP (max 2MB)</span>
          </button>
        )}
        {uploadError && (
          <p className="mt-2 text-xs text-destructive">{uploadError}</p>
        )}
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
              className="flex items-center gap-2 rounded-xl px-2 py-2 -mx-2 text-xs font-medium text-primary active:bg-primary/5 transition-colors"
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded border ${
                  selected.size === unminted.length
                    ? "border-primary bg-primary text-white"
                    : "border-border"
                }`}
              >
                {selected.size === unminted.length && <Check className="h-3 w-3" />}
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
                <button
                  key={wallet}
                  type="button"
                  onClick={() => !isMinted && toggleSelect(wallet)}
                  className={`flex w-full items-center gap-3 bg-card px-4 py-3.5 text-left active:bg-muted/50 transition-colors ${
                    i < checkins.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  {isMinted ? (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  )}
                  <ENSName address={wallet} className="font-mono text-xs text-foreground" />
                  {isMinted && (
                    <span className="ml-auto shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Minted
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Mint button */}
          <div className="sticky bottom-4">
          <Button
            onClick={handleMint}
            disabled={minting || selected.size === 0 || !tokenURI.trim()}
            size="lg"
            className="w-full rounded-2xl py-6 text-base font-semibold shadow-lg shadow-primary/20"
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
          </div>

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
