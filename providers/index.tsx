"use client";

import { WalletProvider } from "@/providers/wallet-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
