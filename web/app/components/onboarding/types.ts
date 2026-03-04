import type { SocialLink } from '@/lib/arkiv/types'

export interface OnboardingData {
  displayName: string
  bio: string
  socialLinks: SocialLink[]
}

export interface StepProps {
  data: OnboardingData
  onUpdate: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack?: () => void
}
