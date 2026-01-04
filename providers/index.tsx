"use client";

import { WalletProvider } from "@/providers/wallet-provider";
import { TransactionQueueProvider } from "@/providers/transaction-queue-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  // During SSR/static generation, skip providers entirely to prevent context errors
  if (typeof window === "undefined") {
    return <>{children}</>;
  }

  return (
    <TransactionQueueProvider>
      <WalletProvider>{children}</WalletProvider>
    </TransactionQueueProvider>
  );
}
