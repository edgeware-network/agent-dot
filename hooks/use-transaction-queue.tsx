"use client";

import { useCallback, useState } from "react";
import type { BatchTransaction } from "./use-utility";

export interface QueuedTransaction {
  id: string;
  transaction: BatchTransaction;
  timestamp: number;
  useBatchAll?: boolean; // Track if this should use batchAll (atomic)
}

export function useTransactionQueue() {
  const [queue, setQueue] = useState<QueuedTransaction[]>([]);

  const addTransaction = useCallback(
    (transaction: BatchTransaction, useBatchAll?: boolean) => {
      const id = `tx-${String(Date.now())}-${Math.random().toString(36).substring(2, 9)}`;
      const queuedTx: QueuedTransaction = {
        id,
        transaction,
        timestamp: Date.now(),
        useBatchAll,
      };
      setQueue((prev) => [...prev, queuedTx]);
      return id;
    },
    [],
  );

  const removeTransaction = useCallback((id: string) => {
    setQueue((prev) => prev.filter((tx) => tx.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const reorderTransaction = useCallback(
    (fromIndex: number, toIndex: number) => {
      setQueue((prev) => {
        const newQueue = [...prev];
        const [moved] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, moved);
        return newQueue;
      });
    },
    [],
  );

  const getQueue = useCallback(() => queue, [queue]);

  return {
    queue,
    addTransaction,
    removeTransaction,
    clearQueue,
    reorderTransaction,
    getQueue,
  };
}
