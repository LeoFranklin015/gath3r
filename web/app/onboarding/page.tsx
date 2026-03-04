"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProfile } from "@/app/hooks/useProfile"
import { useArkivWallet } from "@/app/hooks/useArkivWallet"
import { StepIndicator } from "@/app/components/onboarding/StepIndicator"
import { NameStep } from "@/app/components/onboarding/NameStep"
import { BioStep } from "@/app/components/onboarding/BioStep"
import { SocialLinksStep } from "@/app/components/onboarding/SocialLinksStep"
import { FundStep } from "@/app/components/onboarding/FundStep"
import type { OnboardingData } from "@/app/components/onboarding/types"

const TOTAL_STEPS = 4

export default function OnboardingPage() {
  const { ready, authenticated, user, logout } = usePrivy()
  const router = useRouter()
  const { profile, loading: profileLoading, create } = useProfile()
  const { address } = useArkivWallet()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [direction, setDirection] = useState<"forward" | "backward">("forward")

  const [data, setData] = useState<OnboardingData>({
    displayName: "",
    bio: "",
    avatar: "",
    socialLinks: [],
  })

  // Guard: not logged in → splash
  useEffect(() => {
    if (ready && !authenticated) router.replace("/")
  }, [ready, authenticated, router])

  // Guard: already onboarded → home
  useEffect(() => {
    if (!ready || !authenticated || !user) return
    if (localStorage.getItem(`gath3r:onboarded:${user.id}`)) {
      router.replace("/home")
    }
  }, [ready, authenticated, user, router])

  // If profile already exists on-chain, skip
  useEffect(() => {
    if (profile && user) {
      localStorage.setItem(`gath3r:onboarded:${user.id}`, "true")
      localStorage.setItem(`gath3r:name:${user.id}`, profile.payload.displayName)
      router.replace("/home")
    }
  }, [profile, user, router])

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }))
  }, [])

  const handleFinish = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      await create({
        displayName: data.displayName.trim(),
        bio: data.bio.trim(),
        avatar: data.avatar,
        socialLinks: data.socialLinks.filter((l) => l.url.trim()),
      })
      localStorage.setItem(`gath3r:onboarded:${user.id}`, "true")
      localStorage.setItem(`gath3r:name:${user.id}`, data.displayName.trim())
      router.replace("/home")
    } catch (e) {
      console.error("Failed to create profile on Arkiv:", e)
      localStorage.setItem(`gath3r:onboarded:${user.id}`, "true")
      localStorage.setItem(`gath3r:name:${user.id}`, data.displayName.trim())
      router.replace("/home")
    } finally {
      setSubmitting(false)
    }
  }

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setDirection("forward")
      setStep((s) => s + 1)
    } else {
      handleFinish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, data, user])

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection("backward")
      setStep((s) => s - 1)
    }
  }, [step])

  if (!ready || !authenticated || profileLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  const stepProps = { data, onUpdate: updateData, onNext: goNext, onBack: goBack }

  return (
    <div className="flex h-dvh flex-col items-center bg-background px-6 py-14">
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        <StepIndicator totalSteps={TOTAL_STEPS} currentStep={step} />
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
      </div>

      {/* Step content */}
      <div className="flex flex-1 w-full items-center justify-center overflow-hidden px-2">
        {submitting ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            <p className="text-sm text-muted-foreground">Creating your profile...</p>
          </div>
        ) : (
          <div
            key={step}
            className="flex w-full items-center justify-center animate-step-in"
            style={{ "--step-direction": direction === "forward" ? "1" : "-1" } as React.CSSProperties}
          >
            {step === 0 && <FundStep address={address ?? ""} onNext={goNext} />}
            {step === 1 && <NameStep {...stepProps} seed={address ?? user?.id ?? ""} />}
            {step === 2 && <BioStep {...stepProps} />}
            {step === 3 && <SocialLinksStep {...stepProps} />}
          </div>
        )}
      </div>
    </div>
  )
}
