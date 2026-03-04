'use client'

import { useState, useEffect, useCallback } from 'react'
import { useArkivWallet } from './useArkivWallet'
import { createProfile, getProfileByWallet } from '@/lib/arkiv/entities/profile'
import type { ProfilePayload, ArkivEntity } from '@/lib/arkiv/types'

export function useProfile(walletAddress?: `0x${string}`) {
  const { getClient, address: ownAddress } = useArkivWallet()
  const target = walletAddress ?? ownAddress

  const [profile, setProfile] = useState<ArkivEntity<ProfilePayload> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!target) return
    setLoading(true)
    setError(null)
    try {
      setProfile(await getProfileByWallet(target))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [target])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (
    data: Pick<ProfilePayload, 'displayName' | 'bio' | 'avatar' | 'socialLinks'>,
  ) => {
    if (!ownAddress) throw new Error('No wallet connected')
    const client = await getClient()
    const result = await createProfile(client, ownAddress, data)
    await load()
    return result
  }, [getClient, ownAddress, load])

  return { profile, loading, error, create, reload: load }
}
