import { chainConfig } from "@/papi-config";
import { defineConfig } from "@reactive-dot/core";
import { InjectedWalletProvider } from "@reactive-dot/core/wallets.js";
import { getWsProvider } from "polkadot-api/ws-provider";

export const config = defineConfig({
  chains: Object.fromEntries(
    chainConfig.map((chain) => [
      chain.key,
      {
        descriptor: chain.descriptors,
        // Use WebSocket RPC provider for each chain
        provider: () => getWsProvider(chain.endpoints),
      },
    ]),
  ),
  wallets: [
    new InjectedWalletProvider(), // All browser extension wallets (Talisman, SubWallet, etc.)
  ],
  ssr: true, // Enable SSR support to prevent "readyState" errors
});
