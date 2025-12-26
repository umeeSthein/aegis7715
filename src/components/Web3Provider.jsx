"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { sepolia } from "viem/chains";
import { metaMask } from "wagmi/connectors";
import { CHAIN, RPC_URL } from "../config/constants";

const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
  chains: [CHAIN],
  connectors: [metaMask()],
  multiInjectedProviderDiscovery: false,
  transports: {
    [sepolia.id]: http(RPC_URL),
  },
});

export function Web3Provider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
}

