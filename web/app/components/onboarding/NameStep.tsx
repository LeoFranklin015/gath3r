"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BlobAvatar } from "@/app/components/BlobAvatar"
import type { StepProps } from "./types"

export function NameStep({ data, onUpdate, onNext, seed }: StepProps & { seed: string }) {
  const canContinue = data.displayName.trim().length > 0
  const [uploading, setUploading] = useState(false)

  const handleImageSelect = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload-avatar", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Upload failed")
      onUpdate({ avatar: json.url })
    } catch (e) {
      console.error("Avatar upload failed:", e)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-8">
      {/* Avatar */}
      <div className="rounded-full border border-primary p-1">
        <BlobAvatar
          seed={seed}
          imageUrl={data.avatar || undefined}
          size={100}
          editable
          uploading={uploading}
          onImageSelect={handleImageSelect}
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">
          What should we call you?
        </h1>
        <p className="text-sm text-muted-foreground">
          Tap the avatar to upload a photo.
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
