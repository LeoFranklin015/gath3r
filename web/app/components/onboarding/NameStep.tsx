"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { StepProps } from "./types"

export function NameStep({ data, onUpdate, onNext }: StepProps) {
  const canContinue = data.displayName.trim().length > 0

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-8">
      {/* Avatar preview */}
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
        {data.displayName.trim() ? (
          <span className="text-3xl font-bold text-foreground">
            {data.displayName.trim().charAt(0).toUpperCase()}
          </span>
        ) : (
          <span className="text-3xl text-muted-foreground">?</span>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">
          What should we call you?
        </h1>
        <p className="text-sm text-muted-foreground">
          This is how you&apos;ll appear on events.
        </p>
      </div>

      <Input
        value={data.displayName}
        onChange={(e) => onUpdate({ displayName: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && canContinue && onNext()}
        placeholder="Your name"
        autoFocus
        className="w-full rounded-2xl border-border bg-card py-6 text-center text-lg text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
      />

      <Button
        onClick={onNext}
        disabled={!canContinue}
        size="lg"
        className="w-full rounded-2xl py-6 text-base font-semibold"
      >
        Next
      </Button>
    </div>
  )
}
