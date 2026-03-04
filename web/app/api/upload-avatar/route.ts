import { NextRequest, NextResponse } from "next/server"
import { getPinata } from "@/lib/pinata"

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"]

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File must be an image (PNG, JPEG, GIF, WebP)" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be under 2 MB" }, { status: 400 })
    }

    const pinata = getPinata()
    const result = await pinata.upload.file(file)

    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud"
    const url = `${gateway}/ipfs/${result.IpfsHash}`

    return NextResponse.json({ url, cid: result.IpfsHash })
  } catch (e) {
    console.error("Avatar upload failed:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    )
  }
}
