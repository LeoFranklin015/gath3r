'use client'

import { useState, useEffect } from 'react'
import { getSubnameForAddress } from '@/lib/ens'

// Module-level cache shared across all hook instances
const cache = new Map<string, string | null>()
const pending = new Map<string, Promise<string | null>>()

async function resolve(address: string): Promise<string | null> {
  const key = address.toLowerCase()
  if (cache.has(key)) return cache.get(key)!

  if (pending.has(key)) return pending.get(key)!

  const promise = getSubnameForAddress(address).then((name) => {
    cache.set(key, name)
    pending.delete(key)
    return name
  }).catch(() => {
    cache.set(key, null)
    pending.delete(key)
    return null
  })

  pending.set(key, promise)
  return promise
}

export function useENSName(address: string | undefined): {
  ensName: string | null
  loading: boolean
} {
  const [ensName, setEnsName] = useState<string | null>(() => {
    if (!address) return null
    return cache.get(address.toLowerCase()) ?? null
  })
  const [loading, setLoading] = useState(() => {
    if (!address) return false
    return !cache.has(address.toLowerCase())
  })

  useEffect(() => {
    if (!address) {
      setEnsName(null)
      setLoading(false)
      return
    }

    const key = address.toLowerCase()
    if (cache.has(key)) {
      setEnsName(cache.get(key)!)
      setLoading(false)
      return
    }

    setLoading(true)
    resolve(address).then((name) => {
      setEnsName(name)
      setLoading(false)
    })
  }, [address])

  return { ensName, loading }
}
