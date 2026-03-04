"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Camera } from "lucide-react"
import { cn } from "@/lib/utils"

interface EventImageUploadProps {
  imageUrl: string
  onImageUploaded: (url: string) => void
}

export function EventImageUpload({ imageUrl, onImageUploaded }: EventImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleClick = () => inputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload-avatar", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Upload failed")
      onImageUploaded(json.url)
    } catch (err) {
      console.error("Image upload failed:", err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl transition-all duration-300",
        imageUrl
          ? "shadow-lg shadow-black/10"
          : "border border-dashed border-border hover:border-primary/40",
        "aspect-video",
      )}
    >
      {imageUrl ? (
        <>
          <Image
            src={imageUrl}
            alt="Event cover"
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            unoptimized
          />
          {/* Edit overlay — always visible as a small button */}
          <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors group-hover:bg-black/70">
            <Camera className="h-4 w-4" />
          </div>
        </>
      ) : (
        <div
          className="flex h-full flex-col items-center justify-center gap-3"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.97 0.01 60) 0%, oklch(0.95 0.02 80) 100%)",
          }}
        >
          {uploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                <Camera className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Add cover photo
              </span>
            </>
          )}
        </div>
      )}

      {/* Uploading spinner over image */}
      {uploading && imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </button>
  )
}
