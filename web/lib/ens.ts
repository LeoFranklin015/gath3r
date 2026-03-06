import { JustaName, type ChainId } from "@justaname.id/sdk"
import { sepolia } from "viem/chains"

const ENS_DOMAIN = "arkiv.eth"
const CHAIN_ID = sepolia.id as ChainId

let instance: JustaName | null = null

function getJustaName(): JustaName {
  if (!instance) {
    instance = JustaName.init({
      networks: [
        {
          chainId: CHAIN_ID,
          providerUrl: "https://eth-sepolia.g.alchemy.com/v2/demo",
        },
      ],
      ensDomains: [
        {
          ensDomain: ENS_DOMAIN,
          chainId: CHAIN_ID,
        },
      ],
    })
  }
  return instance
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  try {
    const jn = getJustaName()
    const response = await jn.subnames.isSubnameAvailable({
      subname: `${username}.${ENS_DOMAIN}`,
      chainId: CHAIN_ID,
    })
    return response?.isAvailable ?? false
  } catch (error) {
    console.error("Error checking username availability:", error)
    return false
  }
}

export async function addArkivSubname(
  username: string,
  address: string,
  apiKey: string
): Promise<{ success: boolean; subname?: string; error?: string }> {
  try {
    const jn = getJustaName()
    await jn.subnames.addSubname({
      username,
      ensDomain: ENS_DOMAIN,
      chainId: CHAIN_ID,
      addresses: {
        "60": address,
      },
      apiKey,
      overrideSignatureCheck: true,
    })
    return { success: true, subname: `${username}.${ENS_DOMAIN}` }
  } catch (error: unknown) {
    console.error("Error claiming subname:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to claim subname",
    }
  }
}

export async function getSubnameForAddress(address: string): Promise<string | null> {
  try {
    const jn = getJustaName()
    const response = await jn.subnames.getSubnamesByAddress({
      address,
      chainId: CHAIN_ID,
    })
    const match = response?.subnames?.find((s) =>
      s.ens.endsWith(`.${ENS_DOMAIN}`)
    )
    return match?.ens ?? null
  } catch (error) {
    console.error("Error getting subname:", error)
    return null
  }
}
