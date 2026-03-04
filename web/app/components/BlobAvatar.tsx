"use client"

import { useRef } from "react"
import Image from "next/image"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

interface BlobAvatarProps {
  seed: string
  imageUrl?: string
  size?: number
  editable?: boolean
  uploading?: boolean
  onImageSelect?: (file: File) => void
  className?: string
}

function seedToHue(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

export function BlobAvatar({
  seed,
  imageUrl,
  size = 96,
  editable = false,
  uploading = false,
  onImageSelect,
  className,
}: BlobAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (editable && inputRef.current) {
      inputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onImageSelect) {
      onImageSelect(file)
    }
    e.target.value = ""
  }

  return (
    <div
      className={cn("relative inline-flex shrink-0", editable && "cursor-pointer", className)}
      style={{ width: size, height: size }}
      onClick={handleClick}
    >
      <div
        className="h-full w-full overflow-hidden rounded-full bg-orange-50"
      >
        <Image
          src={imageUrl || "/blob.png"}
          alt="Avatar"
          width={size}
          height={size}
          className={cn(
            "h-full w-full",
            imageUrl ? "object-cover" : "object-contain scale-110"
          )}
          unoptimized
        />
      </div>

      {/* Uploading spinner */}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {/* Pencil overlay */}
      {editable && !uploading && (
        <div className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Pencil className="h-3.5 w-3.5" />
        </div>
      )}

      {editable && (
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      )}
    </div>
  )
}
