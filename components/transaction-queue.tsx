"use client";

import { Button } from "@/components/ui/button";
import type { QueuedTransaction } from "@/hooks/use-transaction-queue";
import { useUtility } from "@/hooks/use-utility";
import { useTransactionQueueContext } from "@/providers/transaction-queue-provider";
import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { MdArrowDownward, MdArrowUpward, MdClose } from "react-icons/md";
import { toast } from "sonner";

function TransactionItem({
  transaction,
  index,
  totalItems,
}: {
  transaction: QueuedTransaction;
  index: number;
  totalItems: number;
}) {
  const { transaction: tx } = transaction;
  const { removeTransaction, reorderTransaction } =
    useTransactionQueueContext();

  const getTransactionLabel = () => {
    switch (tx.type) {
      case "transfer":
        return `Transfer ${String(tx.amount)} PAS to ${tx.to ? `${tx.to.substring(0, 8)}...${tx.to.substring(tx.to.length - 4)}` : "recipient"}`;
      case "xcm":
        return `XCM Transfer: ${String(tx.amount)} ${tx.symbol} from ${tx.src} to ${tx.dst}`;
      case "bond":
        return `Bond ${String(tx.amount)} PAS${tx.payee.type === "Account" && tx.payee.value ? ` to ${tx.payee.value.substring(0, 8)}...` : ""}`;
      case "bondExtra":
        return `Bond Extra ${String(tx.amount)} PAS to existing stake`;
      case "unbond":
        return `Unbond ${String(tx.amount)} PAS from stake (28-day unbonding period)`;
      case "nominate":
        return `Nominate ${String(tx.targets.length)} validator${tx.targets.length > 1 ? "s" : ""}`;
      case "joinPool":
        return `Join Nomination Pool #${String(tx.poolId)} with ${String(tx.amount)} PAS`;
      case "bondExtraPool": {
        const extraTypeLabel =
          tx.extraType === "FreeBalance" ? "from free balance" : "from rewards";
        const amountLabel = tx.amount ? ` ${String(tx.amount)} PAS` : "";
        return `Bond Extra${amountLabel} to nomination pool ${extraTypeLabel}`;
      }
      case "unbondPool":
        return `Unbond ${String(tx.amount)} PAS from nomination pool (28-day unbonding period)`;
      default:
        return "Unknown transaction";
    }
  };

  const canMoveUp = index > 0;
  const canMoveDown = index < totalItems - 1;

  const handleMoveUp = () => {
    if (canMoveUp) {
      reorderTransaction(index, index - 1);
    }
  };

  const handleMoveDown = () => {
    if (canMoveDown) {
      reorderTransaction(index, index + 1);
    }
  };

  const handleCancel = () => {
    removeTransaction(transaction.id);
  };

  return (
    <div className="bg-background/10 flex items-center justify-between gap-2 rounded-lg border-2 border-[#252525] p-3">
      <span className="text-foreground text-sm font-medium">
        {getTransactionLabel()}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMoveUp}
          disabled={!canMoveUp}
          className="h-8 w-8"
          aria-label="Move transaction up"
        >
          <MdArrowUpward className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMoveDown}
          disabled={!canMoveDown}
          className="h-8 w-8"
          aria-label="Move transaction down"
        >
          <MdArrowDownward className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="text-destructive hover:text-destructive/80 h-8 w-8"
          aria-label="Cancel transaction"
        >
          <MdClose className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TransactionQueue({
  sendMessage,
}: {
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
}) {
  const { queue, clearQueue } = useTransactionQueueContext();
  const { sendBatch, sendBatchAll } = useUtility();
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeToastId, setActiveToastId] = useState<string | null>(null);

  // Dismiss all loading toasts when queue is cleared (user canceled)
  useEffect(() => {
    if (queue.length === 0) {
      // Dismiss all toasts when queue is cleared (user might have canceled)
      // This handles the case where sendBatch created a toast but user cleared queue
      toast.dismiss();
      setActiveToastId(null);
    }
  }, [queue.length]);

  const handleExecuteQueue = async () => {
    if (queue.length === 0) {
      return;
    }

    setIsExecuting(true);
    // Dismiss any existing toast
    if (activeToastId) {
      toast.dismiss(activeToastId);
      setActiveToastId(null);
    }

    try {
      // Extract transactions from queue in order
      const transactions = queue.map((item) => item.transaction);

      // Check if any transaction should use batchAll (atomic)
      const hasBatchAll = queue.some((item) => item.useBatchAll === true);
      const batchFunction = hasBatchAll ? sendBatchAll : sendBatch;
      const batchType = hasBatchAll ? "BatchAll" : "Batch";

      // eslint-disable-next-line no-console
      console.log("Executing queue with transactions:", transactions);
      // eslint-disable-next-line no-console
      console.log(`Using ${batchType} method`);

      // Execute with appropriate method
      const txHash = await batchFunction({ transactions, sendMessage });

      if (txHash) {
        toast.success(
          `${batchType} queue executed successfully. Transaction hash: ${txHash}`,
        );
        clearQueue();
      } else {
        toast.error(`Failed to execute ${batchType.toLowerCase()} queue`);
      }
    } catch (error) {
      // Enhanced error logging
      // eslint-disable-next-line no-console
      console.error("Queue execution error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (error instanceof Error && error.stack) {
        // eslint-disable-next-line no-console
        console.error("Error stack:", error.stack);
      }

      // Check if user rejected the transaction
      const isUserRejection =
        errorMessage.toLowerCase().includes("rejected by user") ||
        errorMessage.toLowerCase().includes("user rejected") ||
        errorMessage.toLowerCase().includes("user cancelled") ||
        errorMessage.toLowerCase().includes("user canceled");

      if (isUserRejection) {
        // Clear the queue when user rejects transaction
        clearQueue();
        toast.error("Transaction rejected. Queue cleared.");
      } else {
        toast.error(`Failed to execute queue: ${errorMessage}`);
      }
    } finally {
      setIsExecuting(false);
      // Dismiss any active toast
      if (activeToastId) {
        toast.dismiss(activeToastId);
        setActiveToastId(null);
      }
    }
  };

  if (queue.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-[#bebebe] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#202020]">
          Transaction Queue ({queue.length})
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {queue.map((transaction, index) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            index={index}
            totalItems={queue.length}
          />
        ))}
      </div>
      <Button
        onClick={() => {
          void handleExecuteQueue();
        }}
        disabled={isExecuting || queue.length === 0}
        className="mt-2"
        variant="default"
      >
        {isExecuting
          ? "Executing..."
          : `Execute Queue (${String(queue.length)})`}
      </Button>
    </div>
  );
}
