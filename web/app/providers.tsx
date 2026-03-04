"use client";

import { useEffect } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { kaolin } from "@/lib/chains";
import { arbitrumSepolia } from "viem/chains";

// Privy v3 leaks `isActive` onto DOM elements — suppress the React warning
function useSuppressPrivyWarning() {
  useEffect(() => {
    const orig = console.error;
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].includes("isActive")) return;
      orig(...args);
    };
    return () => { console.error = orig; };
  }, []);
}

export default function Providers({ children }: { children: React.ReactNode }) {
  useSuppressPrivyWarning();
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email"],
        defaultChain: kaolin,
        supportedChains: [kaolin, arbitrumSepolia],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        appearance: {
          theme: "light",
          accentColor: "#676FFF",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
