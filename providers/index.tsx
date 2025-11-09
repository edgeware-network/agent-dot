"use client";

import { WalletProvider } from "@/providers/wallet-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  // During SSR/static generation, skip providers entirely to prevent context errors
  if (typeof window === "undefined") {
    return <>{children}</>;
  }

  return <WalletProvider>{children}</WalletProvider>;
}
