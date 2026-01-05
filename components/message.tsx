"use client";

import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { useNominationPools } from "@/hooks/use-nomination-pools";
import { useStaking } from "@/hooks/use-staking";
import { useTransactions } from "@/hooks/use-transactions";
import { useUtility, type BatchTransaction } from "@/hooks/use-utility";
import { getNodeName } from "@/lib/paraspell";
import { cn, sanitizeText } from "@/lib/utils";
import { useTransactionQueueContext } from "@/providers/transaction-queue-provider";
import {
  Bond,
  BondExtra,
  BondExtraNominationPool,
  JoinNominationPool,
  Nominate,
  Transaction,
  Unbond,
  UnbondFromNominationPool,
  XcmStablecoinTransaction,
  XcmTransaction,
} from "@/types";
import { UseChatHelpers } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { deepEqual } from "fast-equals";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useEffect, useRef } from "react";
import { PulseLoader, SyncLoader } from "react-spinners";

function PurePreviewMessage({
  message,
  isStreaming,
  isLast,
  requiresScrollToBottom,
  sendMessage,
  addToolResult,
}: {
  message: UIMessage;
  isStreaming: boolean;
  isLast: boolean;
  requiresScrollToBottom: boolean;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  addToolResult: UseChatHelpers<UIMessage>["addToolResult"];
}) {
  const hasContent = message.parts.some(
    (part) => part.type === "text" && part.text.trim().length > 0,
  );
  const isLoading =
    message.role === "assistant" && isLast && (isStreaming || !hasContent);

  const handleToolCallId = useRef(new Set<string>());

  // Helper function to count all transaction tool calls in the message
  const countAllTransactionToolCalls = (
    parts: typeof message.parts,
  ): number => {
    return parts.filter(
      (p) =>
        (p.type === "tool-transferAgent" ||
          p.type === "tool-xcmAgent" ||
          p.type === "tool-bondAgent" ||
          p.type === "tool-bondExtraAgent" ||
          p.type === "tool-unbondAgent" ||
          p.type === "tool-nominateAgent" ||
          p.type === "tool-joinNominationPoolsAgent" ||
          p.type === "tool-bondExtraNominationPoolsAgent" ||
          p.type === "tool-unbondFromNominationPoolsAgent" ||
          p.type === "tool-xcmStablecoinFromAssetHubAgent") &&
        p.state === "output-available",
    ).length;
  };
  const xcmTransactionsRef = useRef<
    { tx: XcmTransaction; toolCallId: string }[]
  >([]);
  const xcmBatchingRef = useRef(false);
  const transferTransactionsRef = useRef<
    { tx: Transaction; toolCallId: string }[]
  >([]);
  const transferBatchingRef = useRef(false);
  const poolTransactionsRef = useRef<
    {
      tx: BondExtraNominationPool | UnbondFromNominationPool;
      toolCallId: string;
      type: "bondExtraPool" | "unbondPool";
    }[]
  >([]);
  const poolBatchingRef = useRef(false);
  const stakingTransactionsRef = useRef<
    {
      tx: BondExtra | Unbond | Nominate;
      toolCallId: string;
      type: "bondExtra" | "unbond" | "nominate";
    }[]
  >([]);
  const stakingBatchingRef = useRef(false);
  const { sendTransaction, sendXcmTransaction, sendXcmStablecoinTransaction } =
    useTransactions();
  const { bond, bondExtra, unbond, nominate } = useStaking();
  const { join, bondExtraToPool, unbondFromPool } = useNominationPools();
  const { sendBatch, sendBatchAll } = useUtility();
  const { addTransaction, queue } = useTransactionQueueContext();

  // Reset XCM and transfer collection when message changes
  useEffect(() => {
    xcmTransactionsRef.current = [];
    xcmBatchingRef.current = false;
    transferTransactionsRef.current = [];
    transferBatchingRef.current = false;
    poolTransactionsRef.current = [];
    poolBatchingRef.current = false;
    stakingTransactionsRef.current = [];
    stakingBatchingRef.current = false;
  }, [message.id]);

  // Auto-batch multiple XCM transactions
  useEffect(() => {
    // Count how many xcmAgent tool calls are in this message
    const xcmToolCalls = message.parts.filter(
      (part) =>
        part.type === "tool-xcmAgent" && part.state === "output-available",
    ).length;

    // Detect user preference: check for batchAgent or batchAllAgent tool calls
    const hasBatchAgent = message.parts.some(
      (part) =>
        part.type === "tool-batchAgent" && part.state === "output-available",
    );
    const hasBatchAllAgent = message.parts.some(
      (part) =>
        part.type === "tool-batchAllAgent" && part.state === "output-available",
    );

    // If no explicit tool call, check text parts for keywords
    // Default to batch (not batchAll) unless user explicitly says batchAll
    let useBatchAll = false;
    if (!hasBatchAgent && !hasBatchAllAgent) {
      const messageText = message.parts
        .filter(
          (part): part is Extract<typeof part, { type: "text" }> =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join(" ")
        .toLowerCase();

      // Check for "batchAll" variations - must be explicit
      const batchAllPatterns = [
        "batchall",
        "batch all",
        "batch-all",
        "batch_all",
        "use batchall",
        "use batch all",
        "batchall them",
        "batch all them",
      ];
      const hasBatchAll = batchAllPatterns.some((pattern) =>
        messageText.includes(pattern),
      );

      // Check for "batch" (but not "batchAll") - only use batch if batchAll is not mentioned
      const hasBatch = messageText.includes("batch");

      if (hasBatchAll) {
        // User explicitly said batchAll - use batchAll
        useBatchAll = true;
      } else if (hasBatch) {
        // User said "batch" but not "batchAll" - use batch
        useBatchAll = false;
      } else {
        // No preference specified - default to batchAll for teleports (atomic is safer)
        useBatchAll = true;
      }
    } else {
      // Use explicit tool call preference
      useBatchAll = hasBatchAllAgent;
    }

    // Only batch if:
    // 1. We have multiple XCM transactions (2+)
    // 2. All XCM tool calls have been processed (collected count matches available count)
    // 3. Streaming is done (if last message, wait for streaming to finish; otherwise batch immediately)
    // 4. We haven't already batched these transactions
    // 5. Transactions are NOT in the queue (queue takes precedence)
    const shouldBatch = !isLast || !isStreaming;
    const allXcmCollected =
      xcmTransactionsRef.current.length === xcmToolCalls && xcmToolCalls > 0;
    const hasQueuedXcm = queue.some((tx) => tx.transaction.type === "xcm");

    if (
      xcmTransactionsRef.current.length >= 2 &&
      allXcmCollected &&
      shouldBatch &&
      !xcmBatchingRef.current &&
      !hasQueuedXcm
    ) {
      xcmBatchingRef.current = true;

      // Convert XcmTransaction to BatchTransaction format
      const batchTransactions: BatchTransaction[] =
        xcmTransactionsRef.current.map(({ tx, toolCallId }) => ({
          type: "xcm",
          src: tx.src,
          dst: tx.dst,
          recipient: tx.recipient,
          amount: tx.amount,
          symbol: tx.symbol,
          toolCallId, // Keep toolCallId for later
        }));

      // Clear the ref immediately to prevent race conditions
      xcmTransactionsRef.current = [];

      // Use detected preference to send batch or batchAll
      const batchFunction = useBatchAll ? sendBatchAll : sendBatch;
      const batchType = useBatchAll ? "BatchAll" : "Batch";

      void batchFunction({ transactions: batchTransactions, sendMessage })
        .then((txHash) => {
          if (txHash) {
            // Add success message for each tool call
            batchTransactions.forEach(({ toolCallId }) => {
              if (toolCallId) {
                void addToolResult({
                  tool: "xcmAgent",
                  toolCallId,
                  output: `${batchType} transaction successful. Transaction Hash: ${txHash}`,
                });
              }
            });
          }
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          // Add error message for each tool call
          batchTransactions.forEach(({ toolCallId }) => {
            if (toolCallId) {
              void addToolResult({
                tool: "xcmAgent",
                toolCallId,
                output: `${batchType} transaction failed: ${errorMessage}`,
              });
            }
          });
        });
    } else if (
      xcmTransactionsRef.current.length === 1 &&
      allXcmCollected &&
      shouldBatch &&
      !xcmBatchingRef.current
    ) {
      // Single XCM transaction - send individually
      xcmBatchingRef.current = true;
      const { tx } = xcmTransactionsRef.current[0];
      void sendXcmTransaction({
        ...tx,
        sendMessage,
      });
    }
  }, [
    isStreaming,
    isLast,
    message.parts,
    sendBatch,
    sendBatchAll,
    sendXcmTransaction,
    sendMessage,
    addToolResult,
  ]);

  // Auto-batch multiple transfer transactions
  useEffect(() => {
    // Count how many transferAgent tool calls are in this message
    const transferToolCalls = message.parts.filter(
      (part) =>
        part.type === "tool-transferAgent" && part.state === "output-available",
    ).length;

    // Detect user preference: check for batchAgent or batchAllAgent tool calls
    const hasBatchAgent = message.parts.some(
      (part) =>
        part.type === "tool-batchAgent" && part.state === "output-available",
    );
    const hasBatchAllAgent = message.parts.some(
      (part) =>
        part.type === "tool-batchAllAgent" && part.state === "output-available",
    );

    // If no explicit tool call, check text parts for keywords
    // Default to batch (not batchAll) unless user explicitly says batchAll
    let useBatchAll = false;
    if (!hasBatchAgent && !hasBatchAllAgent) {
      const messageText = message.parts
        .filter(
          (part): part is Extract<typeof part, { type: "text" }> =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join(" ")
        .toLowerCase();

      // Check for "batchAll" variations - must be explicit
      const batchAllPatterns = [
        "batchall",
        "batch all",
        "batch-all",
        "batch_all",
        "use batchall",
        "use batch all",
        "batchall them",
        "batch all them",
      ];
      const hasBatchAll = batchAllPatterns.some((pattern) =>
        messageText.includes(pattern),
      );

      // Check for "batch" (but not "batchAll") - only use batch if batchAll is not mentioned
      const hasBatch = messageText.includes("batch");

      if (hasBatchAll) {
        // User explicitly said batchAll - use batchAll
        useBatchAll = true;
      } else if (hasBatch) {
        // User said "batch" but not "batchAll" - use batch
        useBatchAll = false;
      } else {
        // No preference specified - default to batch for transfers (non-atomic is more flexible)
        useBatchAll = false;
      }
    } else {
      // Use explicit tool call preference
      useBatchAll = hasBatchAllAgent;
    }

    // Only batch if:
    // 1. We have multiple transfer transactions (2+)
    // 2. All transfer tool calls have been processed (collected count matches available count)
    // 3. Streaming is done (if last message, wait for streaming to finish; otherwise batch immediately)
    // 4. We haven't already batched these transactions
    // 5. Transactions are NOT in the queue (queue takes precedence)
    const shouldBatch = !isLast || !isStreaming;
    const allTransfersCollected =
      transferTransactionsRef.current.length === transferToolCalls &&
      transferToolCalls > 0;
    const hasQueuedTransfers = queue.some(
      (tx) => tx.transaction.type === "transfer",
    );

    if (
      transferTransactionsRef.current.length >= 2 &&
      allTransfersCollected &&
      shouldBatch &&
      !transferBatchingRef.current &&
      !hasQueuedTransfers
    ) {
      transferBatchingRef.current = true;

      // Convert Transaction to BatchTransaction format
      const batchTransactions: BatchTransaction[] =
        transferTransactionsRef.current.map(({ tx, toolCallId }) => ({
          type: "transfer",
          to: tx.to,
          amount: tx.amount,
          toolCallId, // Keep toolCallId for later
        }));

      // Clear the ref immediately to prevent race conditions
      transferTransactionsRef.current = [];

      // Use detected preference to send batch or batchAll
      const batchFunction = useBatchAll ? sendBatchAll : sendBatch;
      const batchType = useBatchAll ? "BatchAll" : "Batch";

      void batchFunction({ transactions: batchTransactions, sendMessage })
        .then((txHash) => {
          if (txHash) {
            // Add success message for each tool call
            batchTransactions.forEach(({ toolCallId }) => {
              if (toolCallId) {
                void addToolResult({
                  tool: "transferAgent",
                  toolCallId,
                  output: `${batchType} transaction successful. Transaction Hash: ${txHash}`,
                });
              }
            });
          }
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          // Add error message for each tool call
          batchTransactions.forEach(({ toolCallId }) => {
            if (toolCallId) {
              void addToolResult({
                tool: "transferAgent",
                toolCallId,
                output: `${batchType} transaction failed: ${errorMessage}`,
              });
            }
          });
        });
    } else if (
      transferTransactionsRef.current.length === 1 &&
      allTransfersCollected &&
      shouldBatch &&
      !transferBatchingRef.current
    ) {
      // Single transfer transaction - send individually
      transferBatchingRef.current = true;
      const { tx } = transferTransactionsRef.current[0];
      void sendTransaction({
        ...tx,
        sendMessage,
      });
    }
  }, [
    isStreaming,
    isLast,
    message.parts,
    sendBatch,
    sendBatchAll,
    sendTransaction,
    sendMessage,
    addToolResult,
  ]);

  // Auto-batch multiple pool operations
  useEffect(() => {
    // Count how many pool tool calls are in this message
    const bondExtraPoolCalls = message.parts.filter(
      (part) =>
        part.type === "tool-bondExtraNominationPoolsAgent" &&
        part.state === "output-available",
    ).length;
    const unbondPoolCalls = message.parts.filter(
      (part) =>
        part.type === "tool-unbondFromNominationPoolsAgent" &&
        part.state === "output-available",
    ).length;
    const totalPoolCalls = bondExtraPoolCalls + unbondPoolCalls;

    // Detect user preference: check for batchAgent or batchAllAgent tool calls
    const hasBatchAgent = message.parts.some(
      (part) =>
        part.type === "tool-batchAgent" && part.state === "output-available",
    );
    const hasBatchAllAgent = message.parts.some(
      (part) =>
        part.type === "tool-batchAllAgent" && part.state === "output-available",
    );

    // If no explicit tool call, check text parts for keywords
    // Default to batch (not batchAll) unless user explicitly says batchAll
    let useBatchAll = false;
    if (!hasBatchAgent && !hasBatchAllAgent) {
      const messageText = message.parts
        .filter(
          (part): part is Extract<typeof part, { type: "text" }> =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join(" ")
        .toLowerCase();

      // Check for "batchAll" variations - must be explicit
      const batchAllPatterns = [
        "batchall",
        "batch all",
        "batch-all",
        "batch_all",
        "use batchall",
        "use batch all",
        "batchall them",
        "batch all them",
      ];
      const hasBatchAll = batchAllPatterns.some((pattern) =>
        messageText.includes(pattern),
      );

      // Check for "batch" (but not "batchAll") - only use batch if batchAll is not mentioned
      const hasBatch = messageText.includes("batch");

      if (hasBatchAll) {
        // User explicitly said batchAll - use batchAll
        useBatchAll = true;
      } else if (hasBatch) {
        // User said "batch" but not "batchAll" - use batch
        useBatchAll = false;
      } else {
        // No preference specified - default to batch for pool operations (non-atomic is more flexible)
        useBatchAll = false;
      }
    } else {
      // Use explicit tool call preference
      useBatchAll = hasBatchAllAgent;
    }

    // Only batch if:
    // 1. We have multiple pool transactions (2+)
    // 2. All pool tool calls have been processed (collected count matches available count)
    // 3. Streaming is done (if last message, wait for streaming to finish; otherwise batch immediately)
    // 4. We haven't already batched these transactions
    const shouldBatch = !isLast || !isStreaming;
    const allPoolsCollected =
      poolTransactionsRef.current.length === totalPoolCalls &&
      totalPoolCalls > 0;

    if (
      poolTransactionsRef.current.length >= 2 &&
      allPoolsCollected &&
      shouldBatch &&
      !poolBatchingRef.current
    ) {
      poolBatchingRef.current = true;

      // Convert pool transactions to BatchTransaction format
      const batchTransactions: BatchTransaction[] =
        poolTransactionsRef.current.map(({ tx, type }) => {
          if (type === "bondExtraPool") {
            const poolTx = tx as BondExtraNominationPool;
            return {
              type: "bondExtraPool",
              amount: poolTx.amount,
              extraType:
                poolTx.type === "FreeBalance" ? "FreeBalance" : "Rewards",
            };
          } else {
            const poolTx = tx as UnbondFromNominationPool;
            return {
              type: "unbondPool",
              amount: poolTx.unbondingPoints,
            };
          }
        });

      // Save toolCallIds and types before clearing
      const poolToolCalls = poolTransactionsRef.current.map(
        ({ toolCallId, type }) => ({ toolCallId, type }),
      );

      // Clear the ref immediately to prevent race conditions
      poolTransactionsRef.current = [];

      // Use detected preference to send batch or batchAll
      const batchFunction = useBatchAll ? sendBatchAll : sendBatch;
      const batchType = useBatchAll ? "BatchAll" : "Batch";

      void batchFunction({ transactions: batchTransactions, sendMessage })
        .then((txHash) => {
          if (txHash) {
            // Add success message for each tool call
            poolToolCalls.forEach(({ toolCallId, type }) => {
              if (toolCallId) {
                void addToolResult({
                  tool:
                    type === "bondExtraPool"
                      ? "bondExtraNominationPoolsAgent"
                      : "unbondFromNominationPoolsAgent",
                  toolCallId,
                  output: `${batchType} transaction successful. Transaction Hash: ${txHash}`,
                });
              }
            });
          }
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          // Add error message for each tool call
          poolToolCalls.forEach(({ toolCallId, type }) => {
            if (toolCallId) {
              void addToolResult({
                tool:
                  type === "bondExtraPool"
                    ? "bondExtraNominationPoolsAgent"
                    : "unbondFromNominationPoolsAgent",
                toolCallId,
                output: `${batchType} transaction failed: ${errorMessage}`,
              });
            }
          });
        });
    } else if (
      poolTransactionsRef.current.length === 1 &&
      allPoolsCollected &&
      shouldBatch &&
      !poolBatchingRef.current
    ) {
      // Single pool transaction - send individually
      poolBatchingRef.current = true;
      const { tx, type } = poolTransactionsRef.current[0];
      if (type === "bondExtraPool") {
        const poolTx = tx as BondExtraNominationPool;
        void bondExtraToPool({
          extra: poolTx.type,
          amount: poolTx.amount,
          sendMessage,
        });
      } else {
        const poolTx = tx as UnbondFromNominationPool;
        void unbondFromPool({
          member: poolTx.memberAddress,
          value: poolTx.unbondingPoints,
          sendMessage,
        });
      }
    }
  }, [
    isStreaming,
    isLast,
    message.parts,
    sendBatch,
    sendBatchAll,
    bondExtraToPool,
    unbondFromPool,
    sendMessage,
    addToolResult,
  ]);

  // Auto-batch multiple staking transactions
  useEffect(() => {
    // Check if batchAgent or batchAllAgent tool calls exist (regardless of state)
    // If they do, skip auto-batching - the explicit batch tool should take precedence
    const hasBatchAgentCall = message.parts.some(
      (part) => part.type === "tool-batchAgent",
    );
    const hasBatchAllAgentCall = message.parts.some(
      (part) => part.type === "tool-batchAllAgent",
    );

    // If explicit batch tools are called, don't auto-batch
    if (hasBatchAgentCall || hasBatchAllAgentCall) {
      return;
    }

    // Count how many staking tool calls are in this message
    const stakingToolCalls = message.parts.filter(
      (part) =>
        (part.type === "tool-bondExtraAgent" ||
          part.type === "tool-unbondAgent" ||
          part.type === "tool-nominateAgent") &&
        part.state === "output-available",
    ).length;

    // Detect user preference: check for batchAgent or batchAllAgent tool calls
    const hasBatchAgent = message.parts.some(
      (part) =>
        part.type === "tool-batchAgent" && part.state === "output-available",
    );
    const hasBatchAllAgent = message.parts.some(
      (part) =>
        part.type === "tool-batchAllAgent" && part.state === "output-available",
    );

    // If no explicit tool call, check text parts for keywords
    let useBatchAll = false;
    if (!hasBatchAgent && !hasBatchAllAgent) {
      const messageText = message.parts
        .filter(
          (part): part is Extract<typeof part, { type: "text" }> =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join(" ")
        .toLowerCase();

      // Check for "batchAll" variations - must be explicit
      const batchAllPatterns = [
        "batchall",
        "batch all",
        "batch-all",
        "batch_all",
        "use batchall",
        "use batch all",
        "batchall them",
        "batch all them",
        "batchall these",
        "batch all these",
      ];
      const hasBatchAll = batchAllPatterns.some((pattern) =>
        messageText.includes(pattern),
      );

      // Check for "batch" (but not "batchAll") - only use batch if batchAll is not mentioned
      const hasBatch = messageText.includes("batch");

      if (hasBatchAll) {
        useBatchAll = true;
      } else if (hasBatch) {
        useBatchAll = false;
      } else {
        // No preference specified - default to batch for staking (partial success is acceptable)
        useBatchAll = false;
      }
    } else {
      useBatchAll = hasBatchAllAgent;
    }

    // Only batch if:
    // 1. We have multiple staking transactions (2+)
    // 2. All staking tool calls have been processed
    // 3. Streaming is done
    // 4. We haven't already batched these transactions
    const shouldBatch = !isLast || !isStreaming;
    const allStakingCollected =
      stakingTransactionsRef.current.length === stakingToolCalls &&
      stakingToolCalls > 0;

    if (
      stakingTransactionsRef.current.length >= 2 &&
      allStakingCollected &&
      shouldBatch &&
      !stakingBatchingRef.current
    ) {
      stakingBatchingRef.current = true;

      // Convert staking transactions to BatchTransaction format
      const batchTransactions: BatchTransaction[] =
        stakingTransactionsRef.current.map(({ tx, type }) => {
          if (type === "bondExtra") {
            return {
              type: "bondExtra",
              amount: (tx as BondExtra).maxAdditional,
            };
          } else if (type === "unbond") {
            return {
              type: "unbond",
              amount: (tx as Unbond).value,
            };
          } else {
            // nominate
            return {
              type: "nominate",
              targets: (tx as Nominate).targets,
            };
          }
        });

      // Save toolCallIds and types before clearing
      const stakingToolCallIds = stakingTransactionsRef.current.map(
        ({ toolCallId, type }) => ({ toolCallId, type }),
      );

      // Clear the ref immediately to prevent race conditions
      stakingTransactionsRef.current = [];

      // Use detected preference to send batch or batchAll
      const batchFunction = useBatchAll ? sendBatchAll : sendBatch;
      const batchType = useBatchAll ? "BatchAll" : "Batch";

      void batchFunction({ transactions: batchTransactions, sendMessage })
        .then((txHash) => {
          if (txHash) {
            // Add success message for each tool call
            stakingToolCallIds.forEach(({ toolCallId, type }) => {
              if (toolCallId) {
                void addToolResult({
                  tool:
                    type === "bondExtra"
                      ? "bondExtraAgent"
                      : type === "unbond"
                        ? "unbondAgent"
                        : "nominateAgent",
                  toolCallId,
                  output: `${batchType} transaction successful. Transaction Hash: ${txHash}`,
                });
              }
            });
          }
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          // Add error message for each tool call
          stakingToolCallIds.forEach(({ toolCallId, type }) => {
            if (toolCallId) {
              void addToolResult({
                tool:
                  type === "bondExtra"
                    ? "bondExtraAgent"
                    : type === "unbond"
                      ? "unbondAgent"
                      : "nominateAgent",
                toolCallId,
                output: `${batchType} transaction failed: ${errorMessage}`,
              });
            }
          });
        });
    } else if (
      stakingTransactionsRef.current.length === 1 &&
      allStakingCollected &&
      shouldBatch &&
      !stakingBatchingRef.current
    ) {
      // Single staking transaction - send individually
      stakingBatchingRef.current = true;
      const { tx, type } = stakingTransactionsRef.current[0];
      if (type === "bondExtra") {
        void bondExtra({
          amount: (tx as BondExtra).maxAdditional,
          sendMessage,
        });
      } else if (type === "unbond") {
        void unbond({
          amount: (tx as Unbond).value,
          sendMessage,
        });
      } else {
        // nominate
        void nominate({
          ...(tx as Nominate),
          sendMessage,
        });
      }
    }
  }, [
    isStreaming,
    isLast,
    message.parts,
    sendBatch,
    sendBatchAll,
    bondExtra,
    unbond,
    nominate,
    sendMessage,
    addToolResult,
  ]);

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="group/message mx-auto w-full max-w-3xl px-4"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div className="font-outfit my-2 flex w-full gap-4 text-base shadow-sm group-data-[role=user]/message:ml-auto group-data-[role=user]/message:w-[70%] group-data-[role=user]/message:max-w-2xl sm:group-data-[role=user]/message:w-fit">
          <div
            className={cn("flex w-full flex-col gap-4", {
              "min-h-96":
                message.role === "assistant" && requiresScrollToBottom,
            })}
          >
            {isLoading && !hasContent ? (
              <div className="flex items-center gap-2">
                <SyncLoader color="#bebebe" size={6} />
              </div>
            ) : (
              <div
                className={cn("flex flex-col gap-4", {
                  "rounded-xl bg-[#bebebe] px-3 py-2 text-[#202020]":
                    message.role === "assistant" && hasContent,
                })}
              >
                {message.parts.map((part, index) => {
                  const { type } = part;
                  const key = `message-${message.id}-part-${String(index)}`;

                  if (type === "text") {
                    return (
                      <div
                        data-testid="message-content"
                        className={cn("flex flex-col gap-4", {
                          "rounded-2xl rounded-br-none bg-[#202020] px-3 py-2 text-[#bebebe]":
                            message.role === "user",
                        })}
                        key={key}
                      >
                        {part.text.trim() && (
                          <MemoizedMarkdown
                            id={message.id}
                            key={key}
                            content={sanitizeText(part.text)}
                          />
                        )}
                      </div>
                    );
                  }
                  //TODO: add other tools here!
                  if (
                    type === "tool-transferAgent" &&
                    !handleToolCallId.current.has(part.toolCallId)
                  ) {
                    handleToolCallId.current.add(part.toolCallId);
                    const { state, toolCallId } = part;

                    if (state === "output-available") {
                      const { tx } = part.output as {
                        tx: Transaction;
                      };

                      // Check total number of transactions of ANY type in the message
                      const totalToolCalls = countAllTransactionToolCalls(
                        message.parts,
                      );

                      if (totalToolCalls >= 2) {
                        // Multiple transactions (of any type) - add to queue
                        const batchTx: BatchTransaction = {
                          type: "transfer",
                          to: tx.to,
                          amount: tx.amount,
                        };
                        // Defer state update to avoid setState during render
                        queueMicrotask(() => {
                          addTransaction(batchTx);
                        });

                        // DON'T push to transferTransactionsRef - queue handles execution
                        // This prevents the useEffect from auto-batching
                      } else {
                        // Single transaction - execute immediately
                        // DON'T push to transferTransactionsRef - this prevents the useEffect from executing it again
                        void sendTransaction({
                          to: tx.to,
                          amount: tx.amount,
                          sendMessage,
                        });
                      }

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (
                    type === "tool-xcmAgent" &&
                    !handleToolCallId.current.has(`xcm-${part.toolCallId}`)
                  ) {
                    handleToolCallId.current.add(`xcm-${part.toolCallId}`);
                    const { state, toolCallId } = part;

                    if (state === "output-available") {
                      const { tx } = part.output as {
                        tx: XcmTransaction | undefined;
                      };

                      if (!tx) return <div key={toolCallId}></div>;

                      // Convert user-friendly names to system names for sendXcmTransaction
                      const srcNodeName = getNodeName({
                        name: tx.src,
                        symbol: tx.symbol,
                      });
                      const dstNodeName = getNodeName({
                        name: tx.dst,
                        symbol: tx.symbol,
                      });

                      if (!srcNodeName || !dstNodeName) {
                        void sendMessage({
                          role: "assistant",
                          parts: [
                            {
                              type: "text",
                              text: `Error: Could not resolve chain names "${tx.src}" or "${tx.dst}" to system names.`,
                            },
                          ],
                        });
                        return <div key={toolCallId}></div>;
                      }

                      // Check total number of transactions of ANY type in the message
                      const totalToolCalls = countAllTransactionToolCalls(
                        message.parts,
                      );

                      if (totalToolCalls >= 2) {
                        // Multiple transactions (of any type) - add to queue
                        const batchTx: BatchTransaction = {
                          type: "xcm",
                          src: tx.src, // Keep user-friendly names for batch (will be converted in buildTransactionCall)
                          dst: tx.dst,
                          recipient: tx.recipient,
                          amount: tx.amount,
                          symbol: tx.symbol,
                        };
                        // Defer state update to avoid setState during render
                        queueMicrotask(() => {
                          addTransaction(batchTx);
                        });

                        // DON'T push to xcmTransactionsRef - queue handles execution
                        // This prevents the useEffect from auto-batching
                      } else {
                        // Single transaction - execute immediately
                        // Use system names for sendXcmTransaction
                        void sendXcmTransaction({
                          src: srcNodeName, // Convert to system name
                          dst: dstNodeName, // Convert to system name
                          amount: tx.amount,
                          symbol: tx.symbol,
                          sender: tx.sender, // This should be the active account
                          recipient: tx.recipient,
                          sendMessage,
                        });
                      }

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (
                    type === "tool-xcmStablecoinFromAssetHub" &&
                    !handleToolCallId.current.has(
                      `xcm-stablecoin-${part.toolCallId}`,
                    )
                  ) {
                    handleToolCallId.current.add(
                      `xcm-stablecoin-${part.toolCallId}`,
                    );
                    const { state, toolCallId } = part;

                    if (state === "output-available") {
                      const { tx } = part.output as {
                        tx: XcmStablecoinTransaction | undefined;
                      };

                      if (!tx) return <div key={toolCallId}></div>;

                      // Note: XCM stablecoin transactions are not supported in batch transactions
                      // Keep original execution only
                      void sendXcmStablecoinTransaction({
                        ...tx,
                        sendMessage,
                      });

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (
                    type === "tool-bondAgent" &&
                    !handleToolCallId.current.has(`bond-${part.toolCallId}`)
                  ) {
                    handleToolCallId.current.add(`bond-${part.toolCallId}`);
                    const { state, toolCallId } = part;

                    if (state === "output-available") {
                      const { tx } = part.output as {
                        tx: Bond | undefined;
                      };

                      if (!tx) return <div key={toolCallId}></div>;

                      // Check total number of transactions of ANY type in the message
                      const totalToolCalls = countAllTransactionToolCalls(
                        message.parts,
                      );

                      if (totalToolCalls >= 2) {
                        // Multiple transactions (of any type) - add to queue
                        const batchTx: BatchTransaction = {
                          type: "bond",
                          payee:
                            tx.payee === "Account"
                              ? { type: "Account", value: tx.rewardAccount }
                              : { type: tx.payee, value: undefined },
                          amount: tx.value,
                        };
                        // Defer state update to avoid setState during render
                        queueMicrotask(() => {
                          addTransaction(batchTx);
                        });
                      } else {
                        // Single transaction - execute immediately
                        if (tx.payee === "Account") {
                          void bond({
                            payee: { type: "Account", value: tx.rewardAccount },
                            amount: tx.value,
                            sendMessage,
                          });
                        } else {
                          void bond({
                            payee: { type: tx.payee, value: undefined },
                            amount: tx.value,
                            sendMessage,
                          });
                        }
                      }

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (
                    type === "tool-bondExtraAgent" &&
                    !handleToolCallId.current.has(
                      `bondExtra-${part.toolCallId}`,
                    )
                  ) {
                    handleToolCallId.current.add(
                      `bondExtra-${part.toolCallId}`,
                    );
                    const { state, toolCallId } = part;

                    if (state === "output-available") {
                      const { tx } = part.output as {
                        tx: BondExtra | undefined;
                      };

                      if (!tx) return <div key={toolCallId}></div>;

                      // Check total number of transactions of ANY type in the message
                      const totalToolCalls = countAllTransactionToolCalls(
                        message.parts,
                      );

                      if (totalToolCalls >= 2) {
                        // Multiple transactions (of any type) - add to queue
                        const batchTx: BatchTransaction = {
                          type: "bondExtra",
                          amount: tx.maxAdditional,
                        };
                        // Defer state update to avoid setState during render
                        queueMicrotask(() => {
                          addTransaction(batchTx);
                        });

                        // Collect for batching (keep for backward compatibility)
                        stakingTransactionsRef.current.push({
                          tx,
                          toolCallId,
                          type: "bondExtra",
                        });
                      } else {
                        // Single operation - execute immediately
                        void bondExtra({
                          amount: tx.maxAdditional,
                          sendMessage,
                        });
                      }

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (
                    type === "tool-nominateAgent" &&
                    !handleToolCallId.current.has(`nominate-${part.toolCallId}`)
                  ) {
                    handleToolCallId.current.add(`nominate-${part.toolCallId}`);
                    const { state, toolCallId } = part;

                    if (state === "output-available") {
                      const { tx } = part.output as {
                        tx: Nominate | undefined;
                      };

                      if (!tx) return <div key={toolCallId}></div>;

                      // Check total number of transactions of ANY type in the message
                      const totalToolCalls = countAllTransactionToolCalls(
                        message.parts,
                      );

                      if (totalToolCalls >= 2) {
                        // Multiple transactions (of any type) - add to queue
                        const batchTx: BatchTransaction = {
                          type: "nominate",
                          targets: tx.targets,
                        };
                        // Defer state update to avoid setState during render
                        queueMicrotask(() => {
                          addTransaction(batchTx);
                        });

                        // Collect for batching (keep for backward compatibility)
                        stakingTransactionsRef.current.push({
                          tx,
                          toolCallId,
                          type: "nominate",
                        });
                      } else {
                        // Single operation - execute immediately
                        void nominate({
                          ...tx,
                          sendMessage,
                        });
                      }

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (
                    type === "tool-unbondAgent" &&
                    !handleToolCallId.current.has(`unbond-${part.toolCallId}`)
                  ) {
                    handleToolCallId.current.add(`unbond-${part.toolCallId}`);
                    const { state, toolCallId } = part;

                    if (state === "output-available") {
                      const { tx } = part.output as {
                        tx: Unbond | undefined;
                      };

                      if (!tx) return <div key={toolCallId}></div>;

                      // Check total number of transactions of ANY type in the message
                      const totalToolCalls = countAllTransactionToolCalls(
                        message.parts,
                      );

                      if (totalToolCalls >= 2) {
                        // Multiple transactions (of any type) - add to queue
                        const batchTx: BatchTransaction = {
                          type: "unbond",
                          amount: tx.value,
                        };
                        // Defer state update to avoid setState during render
                        queueMicrotask(() => {
                          addTransaction(batchTx);
                        });

                        // Collect for batching (keep for backward compatibility)
                        stakingTransactionsRef.current.push({
                          tx,
                          toolCallId,
                          type: "unbond",
                        });
                      } else {
                        // Single operation - execute immediately
                        void unbond({
                          amount: tx.value,
                          sendMessage,
                        });
                      }

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (
                    type === "tool-joinNominationPoolsAgent" &&
                    !handleToolCallId.current.has(`joinPool-${part.toolCallId}`)
                  ) {
                    handleToolCallId.current.add(`joinPool-${part.toolCallId}`);
                    const { state, toolCallId } = part;

                    if (state === "output-available") {
                      const { tx } = part.output as {
                        tx: JoinNominationPool | undefined;
                      };

                      if (!tx) return <div key={toolCallId}></div>;

                      // Check total number of transactions of ANY type in the message
                      const totalToolCalls = countAllTransactionToolCalls(
                        message.parts,
                      );

                      if (totalToolCalls >= 2) {
                        // Multiple transactions (of any type) - add to queue
                        const batchTx: BatchTransaction = {
                          type: "joinPool",
                          poolId: tx.poolId,
                          amount: tx.amount,
                        };
                        // Defer state update to avoid setState during render
                        queueMicrotask(() => {
                          addTransaction(batchTx);
                        });
                      } else {
                        // Single transaction - execute immediately
                        void join({
                          poolId: tx.poolId,
                          amount: tx.amount,
                          sendMessage,
                        });
                      }

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (
                    type === "tool-bondExtraNominationPoolsAgent" &&
                    !handleToolCallId.current.has(
                      `bondExtraToPool-${part.toolCallId}`,
                    )
                  ) {
                    handleToolCallId.current.add(
                      `bondExtraToPool-${part.toolCallId}`,
                    );
                    const { state, toolCallId } = part;

                    if (state === "output-available") {
                      const { tx } = part.output as {
                        tx: BondExtraNominationPool | undefined;
                      };

                      if (!tx) return <div key={toolCallId}></div>;

                      // Collect for batching if multiple pool operations exist
                      // Check total number of transactions of ANY type in the message
                      const totalToolCalls = countAllTransactionToolCalls(
                        message.parts,
                      );

                      if (totalToolCalls >= 2) {
                        // Multiple transactions (of any type) - add to queue
                        const batchTx: BatchTransaction = {
                          type: "bondExtraPool",
                          extraType: tx.type,
                          amount: tx.amount,
                        };
                        // Defer state update to avoid setState during render
                        queueMicrotask(() => {
                          addTransaction(batchTx);
                        });

                        // Collect for batching (keep for backward compatibility)
                        poolTransactionsRef.current.push({
                          tx,
                          toolCallId,
                          type: "bondExtraPool",
                        });
                      } else {
                        // Single operation - execute immediately
                        void bondExtraToPool({
                          extra: tx.type,
                          amount: tx.amount,
                          sendMessage,
                        });
                      }

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (
                    type === "tool-unbondFromNominationPoolsAgent" &&
                    !handleToolCallId.current.has(
                      `unbondFromPool-${part.toolCallId}`,
                    )
                  ) {
                    handleToolCallId.current.add(
                      `unbondFromPool-${part.toolCallId}`,
                    );
                    const { state, toolCallId } = part;

                    if (state === "output-available") {
                      const { tx } = part.output as {
                        tx: UnbondFromNominationPool | undefined;
                      };

                      if (!tx) return <div key={toolCallId}></div>;

                      // Collect for batching if multiple pool operations exist
                      // Check total number of transactions of ANY type in the message
                      const totalToolCalls = countAllTransactionToolCalls(
                        message.parts,
                      );

                      if (totalToolCalls >= 2) {
                        // Multiple transactions (of any type) - add to queue
                        const batchTx: BatchTransaction = {
                          type: "unbondPool",
                          amount: tx.unbondingPoints,
                        };
                        // Defer state update to avoid setState during render
                        queueMicrotask(() => {
                          addTransaction(batchTx);
                        });

                        // Collect for batching (keep for backward compatibility)
                        poolTransactionsRef.current.push({
                          tx,
                          toolCallId,
                          type: "unbondPool",
                        });
                      } else {
                        // Single operation - execute immediately
                        void unbondFromPool({
                          member: tx.memberAddress,
                          value: tx.unbondingPoints,
                          sendMessage,
                        });
                      }

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (
                    type === "tool-batchAllAgent" &&
                    !handleToolCallId.current.has(`batchAll-${part.toolCallId}`)
                  ) {
                    handleToolCallId.current.add(`batchAll-${part.toolCallId}`);
                    const { state, toolCallId } = part;

                    // eslint-disable-next-line no-console
                    console.log("batchAllAgent tool call:", {
                      state,
                      toolCallId,
                      output: part.output,
                      error:
                        "error" in part
                          ? (part as { error?: unknown }).error
                          : undefined,
                    });

                    if (state === "output-error") {
                      // eslint-disable-next-line no-console
                      console.error("batchAllAgent: Tool execution failed", {
                        toolCallId,
                        output: part.output,
                        error:
                          "error" in part
                            ? (part as { error?: unknown }).error
                            : undefined,
                      });
                      // Don't return early - let it continue to check other states
                    }

                    if (state === "output-available") {
                      const output = part.output as {
                        tx?: {
                          transactions?: BatchTransaction[];
                          transactionCount?: number;
                        };
                        message?: string;
                      };

                      // eslint-disable-next-line no-console
                      console.log("batchAllAgent output:", output);

                      if (
                        !output.tx?.transactions ||
                        output.tx.transactions.length === 0
                      ) {
                        // eslint-disable-next-line no-console
                        console.warn(
                          "batchAllAgent: No transactions found in output",
                          output,
                        );
                        return <div key={toolCallId}></div>;
                      }

                      const transactions = output.tx.transactions;

                      // Add all transactions to queue instead of executing immediately
                      // Mark as batchAll (atomic) since they came from batchAllAgent
                      // Defer state update to avoid setState during render
                      queueMicrotask(() => {
                        transactions.forEach((tx) => {
                          addTransaction(tx, true);
                        });
                      });

                      // eslint-disable-next-line no-console
                      console.log(
                        "batchAllAgent: Added transactions to queue:",
                        transactions.length,
                      );

                      // DON'T call sendBatchAll here - let the queue handle execution

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (
                    type === "tool-batchAgent" &&
                    !handleToolCallId.current.has(`batch-${part.toolCallId}`)
                  ) {
                    handleToolCallId.current.add(`batch-${part.toolCallId}`);
                    const { state, toolCallId } = part;

                    // eslint-disable-next-line no-console
                    console.log("batchAgent tool call:", {
                      state,
                      toolCallId,
                      output: part.output,
                      error:
                        "error" in part
                          ? (part as { error?: unknown }).error
                          : undefined,
                    });

                    if (state === "output-error") {
                      // eslint-disable-next-line no-console
                      console.error("batchAgent: Tool execution failed", {
                        toolCallId,
                        output: part.output,
                        error:
                          "error" in part
                            ? (part as { error?: unknown }).error
                            : undefined,
                      });
                      // Don't return early - let it continue to check other states
                    }

                    if (state === "output-available") {
                      const output = part.output as {
                        tx?: {
                          transactions?: BatchTransaction[];
                          transactionCount?: number;
                        };
                        message?: string;
                      };

                      // eslint-disable-next-line no-console
                      console.log("batchAgent output:", output);

                      if (
                        !output.tx?.transactions ||
                        output.tx.transactions.length === 0
                      ) {
                        // eslint-disable-next-line no-console
                        console.warn(
                          "batchAgent: No transactions found in output",
                          output,
                        );
                        return <div key={toolCallId}></div>;
                      }

                      const transactions = output.tx.transactions;

                      // Add all transactions to queue instead of executing immediately
                      // Use batch (non-atomic) since they came from batchAgent
                      // Defer state update to avoid setState during render
                      queueMicrotask(() => {
                        transactions.forEach((tx) => {
                          addTransaction(tx, false);
                        });
                      });

                      // eslint-disable-next-line no-console
                      console.log(
                        "batchAgent: Added transactions to queue:",
                        transactions.length,
                      );

                      // DON'T call sendBatch here - let the queue handle execution
                      return <div key={toolCallId}></div>;
                    }
                  }
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.isStreaming !== nextProps.isStreaming) return false;
    if (prevProps.requiresScrollToBottom !== nextProps.requiresScrollToBottom)
      return false;
    if (prevProps.isLast !== nextProps.isLast) return false;
    if (!deepEqual(prevProps.message.parts, nextProps.message.parts))
      return false;
    if (!deepEqual(prevProps.sendMessage, nextProps.sendMessage)) return false;

    return false;
  },
);

export function ThinkingMessage() {
  const role = "assistant";

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="group/message mx-auto min-h-96 w-full max-w-3xl px-4"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cn(
          "flex w-full gap-4 rounded-2xl group-data-[role=user]/message:ml-auto group-data-[role=user]/message:w-fit group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:px-3 group-data-[role=user]/message:py-2",
          {
            "group-data-[role=user]/message:bg-muted": true,
          },
        )}
      >
        <div className="font-outfit my-auto flex w-full items-center gap-[2px] font-medium tracking-tight">
          <div className="text-info text-lg">AgentDot is thinking</div>
          <PulseLoader className="mt-1" color="#bebebe" size={4} />
        </div>
      </div>
    </motion.div>
  );
}
