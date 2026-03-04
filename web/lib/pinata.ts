import { PinataSDK } from "pinata-web3"

let pinata: PinataSDK | null = null

export function getPinata(): PinataSDK {
  if (!pinata) {
    const jwt = process.env.PINATA_JWT
    if (!jwt) throw new Error("PINATA_JWT environment variable is not set")
    pinata = new PinataSDK({ pinataJwt: jwt })
  }
  return pinata
}

export function ipfsToHttp(ipfsUrl: string): string {
  if (!ipfsUrl) return ""
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud"
  if (ipfsUrl.startsWith("ipfs://")) {
    return `${gateway}/ipfs/${ipfsUrl.slice(7)}`
  }
  return ipfsUrl
}
