"use client"

import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import type { StepProps } from "./types"

const BIO_MAX_LENGTH = 160

export function BioStep({ data, onUpdate, onNext, onBack }: StepProps) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">
          Tell people about yourself
        </h1>
        <p className="text-sm text-muted-foreground">
          A short bio — totally optional.
        </p>
      </div>

      <div className="relative w-full">
        <Textarea
          value={data.bio}
          onChange={(e) => {
            if (e.target.value.length <= BIO_MAX_LENGTH) {
              onUpdate({ bio: e.target.value })
            }
          }}
          placeholder="I like building cool things..."
          rows={3}
          autoFocus
          className="w-full resize-none rounded-2xl border-border bg-card px-4 py-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
        />
        <span className="absolute bottom-3 right-4 text-xs text-muted-foreground">
          {data.bio.length}/{BIO_MAX_LENGTH}
        </span>
      </div>

      <div className="flex w-full gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          size="lg"
          className="rounded-2xl px-4 py-6"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={onNext}
          size="lg"
          className="flex-1 rounded-2xl py-6 text-base font-semibold"
        >
          {data.bio.trim() ? "Next" : "Skip"}
        </Button>
      </div>
    </div>
  )
}
