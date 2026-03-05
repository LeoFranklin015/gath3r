"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { Pencil, Globe, Check, Copy, Loader2, Calendar } from "lucide-react"
import { AppHeader } from "@/app/components/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BlobAvatar } from "@/app/components/BlobAvatar"
import { EventCard } from "@/app/components/EventCard"
import { useProfile } from "@/app/hooks/useProfile"
import { useMyEvents } from "@/app/hooks/useMyEvents"
import type { SocialPlatform, SocialLink, EventPayload, ArkivEntity } from "@/lib/arkiv/types"

const BIO_MAX_LENGTH = 160

interface PlatformConfig {
  platform: SocialPlatform
  label: string
  placeholder: string
  prefix: string
}

const PLATFORMS: PlatformConfig[] = [
  { platform: "twitter", label: "X (Twitter)", placeholder: "username", prefix: "@" },
  { platform: "instagram", label: "Instagram", placeholder: "username", prefix: "@" },
  { platform: "github", label: "GitHub", placeholder: "username", prefix: "@" },
  { platform: "website", label: "Website", placeholder: "yoursite.com", prefix: "https://" },
]

export default function ProfilePage() {
  const { ready, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  const router = useRouter()
  const { profile, loading, update, reload } = useProfile()
  const { going, pending, statusMap, loading: eventsLoading } = useMyEvents()

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy")
  const address = embeddedWallet?.address ?? ""

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatar, setAvatar] = useState("")
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.payload.displayName)
      setBio(profile.payload.bio)
      setAvatar(profile.payload.avatar)
      setSocialLinks(profile.payload.socialLinks ?? [])
    }
  }, [profile])

  useEffect(() => {
    if (ready && !authenticated) router.replace("/")
  }, [ready, authenticated, router])

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null

  const cancelEditing = () => {
    if (profile) {
      setDisplayName(profile.payload.displayName)
      setBio(profile.payload.bio)
      setAvatar(profile.payload.avatar)
      setSocialLinks(profile.payload.socialLinks ?? [])
    }
    setEditing(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await update({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar,
        socialLinks: socialLinks.filter((l) => l.url.trim()),
      })
      setEditing(false)
      await reload()
    } catch (e) {
      console.error("Failed to update profile:", e)
    } finally {
      setSaving(false)
    }
  }

  const handleImageSelect = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload-avatar", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Upload failed")
      setAvatar(json.url)
    } catch (e) {
      console.error("Avatar upload failed:", e)
    } finally {
      setUploading(false)
    }
  }

  const getSocialValue = useCallback(
    (platform: SocialPlatform) => socialLinks.find((l) => l.platform === platform)?.url ?? "",
    [socialLinks],
  )

  const updateSocial = (platform: SocialPlatform, url: string) => {
    const rest = socialLinks.filter((l) => l.platform !== platform)
    setSocialLinks(url.trim() ? [...rest, { platform, url: url.trim() }] : rest)
  }

  if (!ready || !authenticated || loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-6">
        <p className="text-sm text-muted-foreground">No profile found.</p>
        <Button onClick={() => router.push("/onboarding")} className="rounded-2xl">
          Create profile
        </Button>
      </div>
    )
  }

  const activeSocials = (profile.payload.socialLinks ?? []).filter((l) => l.url.trim())

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {/* Warm gradient wash behind avatar area */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background: "linear-gradient(180deg, oklch(0.96 0.03 60) 0%, oklch(0.99 0.003 85) 100%)",
        }}
      />

      <AppHeader backHref="/home" />

      {/* Profile content */}
      <div className="relative z-10 flex flex-col px-7 pb-10">
        {/* Avatar with subtle ring */}
        <div className="mt-2">
          <div className="inline-block rounded-full bg-background p-1 shadow-sm ring-1 ring-black/[0.04]">
            <BlobAvatar
              seed={address}
              imageUrl={(editing ? avatar : profile.payload.avatar) || undefined}
              size={110}
              editable={editing}
              uploading={uploading}
              onImageSelect={handleImageSelect}
            />
          </div>
        </div>

        {/* Name */}
        {editing ? (
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="mt-6 max-w-xs rounded-2xl border-border bg-card py-5 text-lg font-bold text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
          />
        ) : (
          <div className="mt-5">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
              {profile.payload.displayName}
            </h1>
            {address && <CopyAddress address={address} />}
          </div>
        )}

        {/* Meta row: joined + stats */}
        {!editing && (
          <div className="mt-3 flex flex-col gap-2">
            {joinedDate && (
              <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Joined {joinedDate}</span>
              </div>
            )}
            <div className="flex items-center gap-5 text-[14px]">
              <span className="flex items-center gap-1">
                <span className="font-semibold tabular-nums text-foreground">{profile.payload.eventsHosted}</span>
                <span className="text-muted-foreground">Hosted</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="font-semibold tabular-nums text-foreground">{profile.payload.eventsAttended}</span>
                <span className="text-muted-foreground">Attended</span>
              </span>
            </div>
          </div>
        )}

        {/* Social icons */}
        {!editing && activeSocials.length > 0 && (
          <div className="mt-5 flex items-center gap-1">
            {activeSocials.map((link) => (
              <a
                key={link.platform}
                href={socialHref(link)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <PlatformIcon platform={link.platform} size={18} />
              </a>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="mt-6 h-px bg-border" />

        {/* Bio */}
        {editing ? (
          <div className="relative mt-6">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Bio
            </label>
            <Textarea
              value={bio}
              onChange={(e) => {
                if (e.target.value.length <= BIO_MAX_LENGTH) setBio(e.target.value)
              }}
              placeholder="Tell people about yourself..."
              rows={3}
              className="w-full max-w-sm resize-none rounded-2xl border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
            />
            <span className="absolute bottom-2.5 right-3 text-[11px] tabular-nums text-muted-foreground/60">
              {bio.length}/{BIO_MAX_LENGTH}
            </span>
          </div>
        ) : profile.payload.bio ? (
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-foreground/70">
            {profile.payload.bio}
          </p>
        ) : null}

        {/* Edit: social inputs */}
        {editing && (
          <div className="mt-6 flex max-w-sm flex-col gap-3">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Socials
            </label>
            {PLATFORMS.map(({ platform, label, placeholder, prefix }) => (
              <div key={platform} className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <div className="flex items-center overflow-hidden rounded-2xl border border-border bg-card transition-colors focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/20">
                  <div className="flex items-center justify-center pl-3 text-muted-foreground">
                    <PlatformIcon platform={platform} size={16} />
                  </div>
                  <span className="pl-2 text-sm text-muted-foreground/60">{prefix}</span>
                  <Input
                    value={getSocialValue(platform)}
                    onChange={(e) => updateSocial(platform, e.target.value)}
                    placeholder={placeholder}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Save */}
        {editing && (
          <Button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            size="lg"
            className="mt-8 w-full max-w-sm rounded-2xl py-6 text-base font-semibold shadow-md shadow-primary/20 transition-shadow hover:shadow-lg hover:shadow-primary/25"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save changes
              </>
            )}
          </Button>
        )}
      </div>

      {/* Events list — only show when not editing */}
      {!editing && (
        <MyEventsList
          going={going}
          pending={pending}
          statusMap={statusMap}
          loading={eventsLoading}
        />
      )}
    </div>
  )
}

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:bg-muted"
    >
      {address.slice(0, 6)}...{address.slice(-4)}
      {copied
        ? <Check className="h-3 w-3 text-green-500" />
        : <Copy className="h-3 w-3" />
      }
    </button>
  )
}

function socialHref(link: SocialLink): string {
  switch (link.platform) {
    case "twitter": return `https://x.com/${link.url}`
    case "instagram": return `https://instagram.com/${link.url}`
    case "github": return `https://github.com/${link.url}`
    case "website": return link.url.startsWith("http") ? link.url : `https://${link.url}`
  }
}

function MyEventsList({
  going,
  pending,
  statusMap,
  loading,
}: {
  going: ArkivEntity<EventPayload>[]
  pending: ArkivEntity<EventPayload>[]
  statusMap: Map<string, "going" | "pending" | "draft">
  loading: boolean
}) {
  const router = useRouter()
  const allEvents = [...going, ...pending].sort(
    (a, b) => a.payload.startTime - b.payload.startTime,
  )

  return (
    <div className="relative z-10">
      <div className="border-t border-border/60 px-5 pt-4 pb-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          Events
        </p>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : allEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
              <span className="text-xl">📅</span>
            </div>
            <p className="text-sm text-muted-foreground">No events yet</p>
          </div>
        ) : (
          <div>
            {allEvents.map((event, i) => (
              <div key={event.entityKey}>
                <EventCard
                  event={event}
                  status={statusMap.get(event.entityKey)}
                  onClick={() => router.push(`/events/${event.entityKey}`)}
                />
                {i < allEvents.length - 1 && (
                  <div className="h-px bg-border/50" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PlatformIcon({ platform, size = 18 }: { platform: SocialPlatform; size?: number }) {
  const s = { width: size, height: size }
  switch (platform) {
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={s}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      )
    case "github":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={s}>
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      )
    case "website":
      return <Globe style={s} />
  }
}
