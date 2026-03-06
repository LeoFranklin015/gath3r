"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { isUsernameAvailable, addArkivSubname } from "@/lib/ens"
import type { StepProps } from "./types"

const isValidUsername = (name: string) => /^[a-z0-9-]{3,63}$/.test(name)

interface UsernameStepProps extends StepProps {
  address: string
}

export function UsernameStep({ onNext, address }: UsernameStepProps) {
  const [username, setUsername] = useState("")
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAvailable(null)
    setError(null)
    if (!username || !isValidUsername(username)) return

    const timer = setTimeout(async () => {
      setChecking(true)
      try {
        setAvailable(await isUsernameAvailable(username))
      } catch {
        setError("Failed to check availability")
      } finally {
        setChecking(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [username])

  const handleClaim = useCallback(async () => {
    if (!available || !address) return
    const apiKey = process.env.NEXT_PUBLIC_JUSTA_NAME_API_KEY
    if (!apiKey) { setError("API key not configured"); return }

    setClaiming(true)
    setError(null)
    try {
      const result = await addArkivSubname(username, address, apiKey)
      if (result.success) {
        setClaimed(true)
      } else {
        setError(result.error || "Failed to claim")
      }
    } catch {
      setError("Network error")
    } finally {
      setClaiming(false)
    }
  }, [username, address, available])

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          Claim free ENS name
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a <span className="font-medium text-foreground">.arkiv.eth</span> username
        </p>
      </div>

      {/* Input */}
      <div className="w-full">
        <div
          className={cn(
            "flex items-center rounded-2xl border bg-card transition-colors",
            "focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40",
            available === true && "border-green-500",
            available === false && "border-destructive",
            available === null && "border-border"
          )}
        >
          <div className="flex flex-1 items-center justify-center gap-0 py-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="username"
              autoFocus
              disabled={claiming || claimed}
              size={Math.max(username.length, 8)}
              className="w-auto bg-transparent text-base text-foreground text-right placeholder:text-muted-foreground/50 outline-none"
            />
            <span className="shrink-0 text-base text-muted-foreground">.arkiv.eth</span>
          </div>
          <div className="shrink-0 w-8 flex items-center justify-center pr-3">
            {checking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {!checking && available === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {!checking && available === false && <XCircle className="h-4 w-4 text-destructive" />}
          </div>
        </div>

        {/* Minimal status */}
        <div className="mt-1.5 min-h-[20px] px-1">
          {username && !isValidUsername(username) && (
            <p className="text-xs text-muted-foreground">Min 3 chars, lowercase + numbers + hyphens</p>
          )}
          {available === false && (
            <p className="text-xs text-destructive">Already taken</p>
          )}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      </div>

      {/* Claim / Continue */}
      {claimed ? (
        <Button
          onClick={onNext}
          size="lg"
          className="w-full rounded-2xl py-2 text-base font-semibold"
        >
          Continue
        </Button>
      ) : (
        <Button
          onClick={handleClaim}
          disabled={!available || claiming || !address}
          size="lg"
          className="w-full rounded-2xl py-2 text-base font-semibold"
        >
          {claiming ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Claiming...</>
          ) : (
            "Claim"
          )}
        </Button>
      )}

      {/* Skip */}
      {!claimed && (
        <button
          onClick={onNext}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground active:text-foreground"
        >
          Skip for now
        </button>
      )}
    </div>
  )
}
