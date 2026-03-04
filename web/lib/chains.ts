import { defineChain } from "viem";

export const arbitrumSepolia = defineChain({
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia-rollup.arbitrum.io/rpc"],
    },
  },
  testnet: true,
});

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
