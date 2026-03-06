"use client"

import { useENSName } from "@/app/hooks/useENSName"

function short(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

interface ENSNameProps {
  address: string
  className?: string
}

export function ENSName({ address, className }: ENSNameProps) {
  const { ensName } = useENSName(address)

  return (
    <span className={className}>
      {ensName ?? short(address)}
    </span>
  )
}
