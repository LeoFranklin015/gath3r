import { NextRequest, NextResponse } from "next/server"
import { PrivyClient } from "@privy-io/server-auth"

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
)

// POST /api/privy/emails
// Body: { wallets: string[] }
// Returns: { emails: Record<string, string | null> }
export async function POST(req: NextRequest) {
  try {
    const { wallets } = await req.json()

    if (!Array.isArray(wallets) || wallets.length === 0) {
      return NextResponse.json({ error: "wallets array required" }, { status: 400 })
    }

    const emails: Record<string, string | null> = {}

    for (const wallet of wallets) {
      try {
        const user = await privy.getUserByWalletAddress(wallet)
        emails[wallet.toLowerCase()] = user?.email?.address ?? null
      } catch {
        emails[wallet.toLowerCase()] = null
      }
    }

    return NextResponse.json({ emails })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to resolve emails" },
      { status: 500 },
    )
  }
}
