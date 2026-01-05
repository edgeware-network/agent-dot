"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTransactionQueue } from "@/hooks/use-transaction-queue";
import type { BatchTransaction } from "@/hooks/use-utility";

interface TransactionQueueContextType {
  queue: ReturnType<typeof useTransactionQueue>["queue"];
  addTransaction: (
    transaction: BatchTransaction,
    useBatchAll?: boolean,
  ) => string;
  removeTransaction: (id: string) => void;
  clearQueue: () => void;
  reorderTransaction: (fromIndex: number, toIndex: number) => void;
  getQueue: () => ReturnType<typeof useTransactionQueue>["queue"];
}

const TransactionQueueContext =
  createContext<TransactionQueueContextType | null>(null);

export function TransactionQueueProvider({
  children,
}: {
  children: ReactNode;
}) {
  const queueHook = useTransactionQueue();

  return (
    <TransactionQueueContext.Provider value={queueHook}>
      {children}
    </TransactionQueueContext.Provider>
  );
}

export function useTransactionQueueContext() {
  const context = useContext(TransactionQueueContext);
  if (!context) {
    throw new Error(
      "useTransactionQueueContext must be used within TransactionQueueProvider",
    );
  }
  return context;
}
