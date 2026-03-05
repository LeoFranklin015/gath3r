"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { UserButton } from "@/app/components/UserButton"

interface AppHeaderProps {
  backHref?: string
  onBack?: () => void
}

export function AppHeader({ backHref, onBack }: AppHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  const showBack = !!backHref || !!onBack

  return (
    <header className="relative z-20 flex items-center justify-between px-5 pt-10 pb-2">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm transition-colors hover:bg-background/80"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
        )}
        <span className="text-lg font-bold text-foreground">Gath3r</span>
      </div>
      <UserButton />
    </header>
  )
}
