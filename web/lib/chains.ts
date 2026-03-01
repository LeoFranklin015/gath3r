import { defineChain } from "viem";

export const kaolin = defineChain({
  id: 60138453025,
  name: "Kaolin",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://kaolin.hoodi.arkiv.network/rpc"],
      webSocket: ["wss://kaolin.hoodi.arkiv.network/rpc/ws"],
    },
  },
  contracts: {
    standardBridge: {
      address: "0x6db217C596Cd203256058dBbFcA37d5A62161b78",
    },
  },
  testnet: true,
});
