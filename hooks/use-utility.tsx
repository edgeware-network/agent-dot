"use client";

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { TOKEN_DECIMALS } from "@/constants/chains";
import { getNodeName, isValidTeleportRoute } from "@/lib/paraspell";

import { convertAmountToPlancks, getSubscanSubdomain } from "@/lib/utils";
import { chainConfig } from "@/papi-config";
import { useWallet } from "@/providers/wallet-provider";
import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { Builder, convertSs58 } from "@paraspell/sdk";
import { MultiAddress } from "@polkadot-api/descriptors";
import { useChainId, useClient, useTypedApi } from "@reactive-dot/react";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

function bigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === "bigint") {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(bigIntToString);
  }
  if (typeof obj === "object") {
    const newObj: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = bigIntToString(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

export type BatchTransaction =
  | {
      type: "transfer";
      to: string;
      amount: number;
      toolCallId?: string;
    }
  | {
      type: "bond";
      amount: number;
      payee: {
        type: "Staked" | "Stash" | "Controller" | "Account" | "None";
        value?: string;
      };
      toolCallId?: string;
    }
  | {
      type: "unbond";
      amount: number;
      toolCallId?: string;
    }
  | {
      type: "bondExtra";
      amount: number;
      toolCallId?: string;
    }
  | {
      type: "nominate";
      targets: string[];
      toolCallId?: string;
    }
  | {
      type: "joinPool";
      poolId: number;
      amount: number;
      toolCallId?: string;
    }
  | {
      type: "bondExtraPool";
      amount?: number;
      extraType: "FreeBalance" | "Rewards";
      toolCallId?: string;
    }
  | {
      type: "unbondPool";
      amount: number;
      toolCallId?: string;
    }
  | {
      type: "xcm";
      src: string;
      dst: string;
      recipient: string;
      amount: number;
      symbol: "DOT" | "WND" | "PAS"; // Narrowed type
      toolCallId?: string;
    };

export function useUtility() {
  const client = useClient();
  const chainId = useChainId();
  const api = useTypedApi();
  const activeChain =
    chainConfig.find((chain) => chain.key === chainId) ?? chainConfig[0];
  const { selectedAccount } = useWallet();

  // Helper function to generate unique toast IDs
  const generateToastId = () => {
    return `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  // Refs to prevent multiple concurrent batch calls
  const batchInProgress = useRef(false);
  const batchAllInProgress = useRef(false);

  // Refs to track active transaction hashes to prevent duplicate subscriptions
  const activeBatchTxHash = useRef<string | null>(null);
  const activeBatchAllTxHash = useRef<string | null>(null);

  // Refs to track sent messages by unique ID to prevent duplicates
  const sentBatchMessages = useRef<Set<string>>(new Set());
  const sentBatchAllMessages = useRef<Set<string>>(new Set());

  // Helper to get token symbol from chain key
  const getTokenSymbol = useCallback((): "DOT" | "WND" | "PAS" => {
    if (activeChain.key === "polkadot") return "DOT";
    if (activeChain.key === "paseo") return "PAS";
    if (activeChain.key === "westend") return "WND";
    return "DOT"; // default
  }, [activeChain.key]);

  const buildTransactionCall = useCallback(
    async (tx: BatchTransaction): Promise<any> => {
      if (!api || !selectedAccount) return null;

      const tokenSymbol = getTokenSymbol();

      try {
        if (tx.type === "transfer") {
          const amountInPlancks = convertAmountToPlancks(
            tx.amount,
            TOKEN_DECIMALS[tokenSymbol] ?? 10,
          );

          return (api.tx.Balances.transfer_keep_alive as any)({
            value: amountInPlancks,
            dest: MultiAddress.Id(tx.to),
          });
        } else if (tx.type === "bond") {
          const amountInPlancks = convertAmountToPlancks(
            tx.amount,
            TOKEN_DECIMALS[tokenSymbol] ?? 10,
          );

          let payee: any;
          if (tx.payee.type === "Account") {
            payee = { Account: tx.payee.value };
          } else {
            payee = tx.payee.type;
          }

          return (api.tx.Staking.bond as any)({
            value: amountInPlancks,
            payee: payee,
          });
        } else if (tx.type === "unbond") {
          const amountInPlancks = convertAmountToPlancks(
            tx.amount,
            TOKEN_DECIMALS[tokenSymbol] ?? 10,
          );

          return (api.tx.Staking.unbond as any)({ value: amountInPlancks });
        } else if (tx.type === "bondExtra") {
          const amountInPlancks = convertAmountToPlancks(
            tx.amount,
            TOKEN_DECIMALS[tokenSymbol] ?? 10,
          );

          return (api.tx.Staking.bond_extra as any)({
            max_additional: amountInPlancks,
          });
        } else if (tx.type === "nominate") {
          return (api.tx.Staking.nominate as any)({
            targets: tx.targets.map((target) => MultiAddress.Id(target)),
          });
        } else if (tx.type === "joinPool") {
          const amountInPlancks = convertAmountToPlancks(
            tx.amount,
            TOKEN_DECIMALS[tokenSymbol] ?? 10,
          );

          return (api.tx.NominationPools.join as any)({
            amount: amountInPlancks,
            pool_id: tx.poolId,
          });
        } else if (tx.type === "bondExtraPool") {
          let extra: any;
          if (tx.extraType === "FreeBalance") {
            if (!tx.amount) {
              throw new Error("Amount is required for FreeBalance bond extra");
            }
            const amountInPlancks = convertAmountToPlancks(
              tx.amount,
              TOKEN_DECIMALS[tokenSymbol] ?? 10,
            );
            extra = { type: "FreeBalance", value: BigInt(amountInPlancks) };
          } else {
            // Rewards type - no value needed
            extra = { type: "Rewards" };
          }

          return (api.tx.NominationPools.bond_extra as any)({ extra });
        } else if (tx.type === "unbondPool") {
          const amountInPlancks = convertAmountToPlancks(
            tx.amount,
            TOKEN_DECIMALS[tokenSymbol] ?? 10,
          );

          return (api.tx.NominationPools.unbond as any)({
            member_account: MultiAddress.Id(selectedAccount.address),
            unbonding_points: amountInPlancks,
          });
        } else if (tx.type === "xcm") {
          try {
            const { src, dst, amount, symbol, recipient } = tx;

            // Debug logs
            // eslint-disable-next-line no-console
            console.log("XCM Tx object received by buildTransactionCall:", tx);
            // eslint-disable-next-line no-console
            console.log(`XCM Tx src: '${src}', dst: '${dst}'`);

            const finalRecipient =
              recipient.toLowerCase() === "active"
                ? selectedAccount.address
                : recipient;

            // Resolve user-friendly names to system names
            const srcNodeName = getNodeName({
              name: src,
              symbol,
            });
            const dstNodeName = getNodeName({
              name: dst,
              symbol,
            });

            if (!srcNodeName || !dstNodeName) {
              throw new Error(
                `Invalid source or destination chain name: ${src} -> ${dst}`,
              );
            }

            // CRITICAL: Teleport ALWAYS means cross-chain. Never treat as same-chain transfer.
            // If src === dst, this is an error - teleport requires different chains.
            if (srcNodeName === dstNodeName) {
              throw new Error(
                `Invalid teleport: Source and destination are the same (${src}). ` +
                  "Teleport requires different chains. Use transfer for same-chain transactions.",
              );
            }

            // Use Paraspell's Builder to construct the XCM call
            // Validate symbol is one of the supported types
            if (symbol !== "DOT" && symbol !== "WND" && symbol !== "PAS") {
              throw new Error(
                `Invalid symbol "${symbol}". Must be one of: DOT, WND, PAS`,
              );
            }

            if (!isValidTeleportRoute(src, dst, symbol)) {
              throw new Error(
                `Invalid teleport route: Cannot teleport from "${src}" to "${dst}".`,
              );
            }

            const amountInPlancks = convertAmountToPlancks(
              amount,
              TOKEN_DECIMALS[symbol as keyof typeof TOKEN_DECIMALS],
            );

            // Build XCM transaction using Paraspell
            const builder = Builder()
              .from(srcNodeName)
              .to(dstNodeName)
              .currency({ symbol: tx.symbol, amount: amountInPlancks })
              .address(convertSs58(finalRecipient, dstNodeName))
              .senderAddress(selectedAccount.address);

            const txObj = await builder.build();

            // Disconnect builder before returning or throwing
            await builder.disconnect();

            const sanitizedTxObj = bigIntToString(txObj);

            // eslint-disable-next-line no-console
            console.log(
              "Paraspell txObj (sanitized):",
              JSON.stringify(sanitizedTxObj, null, 2),
            );
            // eslint-disable-next-line no-console
            console.log(
              "Paraspell txObj.decodedCall (sanitized):",
              JSON.stringify(sanitizedTxObj.decodedCall, null, 2),
            );

            if (!sanitizedTxObj.decodedCall) {
              // eslint-disable-next-line no-console
              console.error(
                "Could not extract call from Paraspell Builder transaction. Transaction object:",
                sanitizedTxObj,
              );
              throw new Error(
                "Could not extract call from Paraspell Builder transaction. Transaction object structure: " +
                  JSON.stringify(Object.keys(sanitizedTxObj as object)),
              );
            }

            // For batching, it's crucial to return the sanitized raw Call object
            return sanitizedTxObj.decodedCall;
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Error building XCM transaction:", error);
            throw error;
          }
        } else {
          // This should be unreachable if all transaction types are handled
          throw new Error("Unknown or unhandled transaction type");
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error building transaction call:", error);
        throw error;
      }
    },
    [api, selectedAccount, activeChain, client, getTokenSymbol],
  );

  const sendBatch = useCallback(
    async ({
      transactions,
      sendMessage,
    }: {
      transactions: BatchTransaction[];
      sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
    }): Promise<string | null> => {
      // Prevent multiple concurrent batch calls
      if (batchInProgress.current || activeBatchTxHash.current !== null) {
        // eslint-disable-next-line no-console
        console.log("sendBatch: Already in progress, skipping duplicate call");
        return null;
      }
      batchInProgress.current = true;

      // Clear sent messages for this new batch
      sentBatchMessages.current.clear();

      try {
        if (!api || !selectedAccount) {
          toast.error("Wallet not connected");
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: "Please connect your wallet first",
              },
            ],
          });
          return null;
        }

        const toastId = generateToastId();
        toast.loading("Processing Batch transaction...", { id: toastId });

        // Build all transaction calls
        let rawCalls: any[];
        try {
          const callPromises = transactions.map((tx) =>
            buildTransactionCall(tx),
          );
          rawCalls = await Promise.all(callPromises);
        } catch (error) {
          // Dismiss loading toast on build error
          toast.dismiss(toastId);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          // eslint-disable-next-line no-console
          console.error("Error building transactions:", error);
          toast.error(`Failed to build transactions: ${errorMessage}`);
          throw new Error(`Failed to build transactions: ${errorMessage}`);
        }

        // Filter out null calls
        const validCalls = rawCalls.filter((call) => call !== null);

        if (validCalls.length === 0) {
          throw new Error("No valid transactions to batch");
        }

        // Create batch transaction
        // Normalize calls: extract decodedCall if it exists, otherwise use call as-is
        const rawCallsForBatch = validCalls.map(
          (call) => call.decodedCall ?? call,
        );
        const batchTx = (api.tx.Utility.batch as any)({
          calls: rawCallsForBatch,
        });

        // Sign, submit, and watch transaction status
        return await new Promise<string | null>((resolve, reject) => {
          let txHash: string | null = null;
          let subscriptionObj: { unsubscribe: () => void } | null = null;
          let isResolved = false;

          try {
            const subscription = batchTx.signSubmitAndWatch(
              selectedAccount.polkadotSigner,
            );

            subscriptionObj = subscription.subscribe({
              next: (status: any) => {
                // Early return if already resolved to prevent duplicate processing
                if (isResolved) {
                  return;
                }

                // Set txHash as soon as we get it and track it
                if (status.txHash && !txHash) {
                  txHash = String(status.txHash);
                  activeBatchTxHash.current = txHash;
                }

                // Handle different status types based on polkadot-api structure
                if (status.type === "signed") {
                  txHash = txHash ?? String(status.txHash);
                  activeBatchTxHash.current = txHash;
                  const id = `signed-${txHash}`;

                  // Atomic check-and-add to prevent race conditions
                  if (sentBatchMessages.current.has(id)) {
                    return;
                  }
                  sentBatchMessages.current.add(id);

                  toast.loading(`Batch transaction signed: ${txHash}...`, {
                    id: toastId,
                  });
                  // Only show toast, no chat message for signed status
                } else if (status.type === "broadcasted") {
                  txHash ??= String(status.txHash);
                  activeBatchTxHash.current = txHash;
                  const id = `broadcasted-${txHash}`;

                  // Atomic check-and-add to prevent race conditions
                  if (sentBatchMessages.current.has(id)) {
                    return;
                  }
                  sentBatchMessages.current.add(id);

                  toast.loading(`Batch transaction broadcasted: ${txHash}...`, {
                    id: toastId,
                  });
                  // Only show toast, no chat message for broadcasted status
                } else if (status.type === "txBestBlocksState") {
                  txHash ??= String(status.txHash);
                  activeBatchTxHash.current = txHash;

                  if (status.found) {
                    const blockNumber = status.block.number;
                    const id = `inblock-${txHash}-${blockNumber}`;

                    if (sentBatchMessages.current.has(id)) {
                      // Already sent, just update toast
                      toast.loading(
                        `Batch transaction included in block #${String(blockNumber)}: ${String(status.block.hash)}...`,
                        { id: toastId },
                      );
                      return;
                    }
                    sentBatchMessages.current.add(id);

                    toast.loading(
                      `Batch transaction included in block #${String(blockNumber)}: ${String(status.block.hash)}...`,
                      { id: toastId },
                    );
                    // Only show toast, no chat message for in-block status
                  } else {
                    // Transaction not found yet, but checking validity
                    toast.loading(
                      `Batch transaction pending... (valid: ${status.isValid ? "yes" : "no"})`,
                      { id: toastId },
                    );
                  }
                } else if (status.type === "finalized") {
                  const finalTxHash = txHash ?? String(status.txHash);
                  activeBatchTxHash.current = finalTxHash;
                  const blockNumber = status.block.number;
                  const id = `finalized-${finalTxHash}`;

                  if (sentBatchMessages.current.has(id)) {
                    // Already processed
                    return;
                  }
                  sentBatchMessages.current.add(id);

                  if (!status.ok) {
                    // Transaction finalized but failed
                    if (isResolved) {
                      return;
                    }
                    isResolved = true;

                    const errorMessage = status.dispatchError
                      ? JSON.stringify(status.dispatchError)
                      : "Transaction failed";
                    toast.error(`Batch transaction failed: ${errorMessage}`, {
                      id: toastId,
                    });
                    void sendMessage({
                      role: "assistant",
                      parts: [
                        {
                          type: "text",
                          text: `Batch transaction finalized in block #${String(blockNumber)} but failed: ${errorMessage}. Hash: ${finalTxHash}`,
                        },
                      ],
                    });
                    if (subscriptionObj) {
                      subscriptionObj.unsubscribe();
                    }
                    activeBatchTxHash.current = null;
                    reject(new Error(errorMessage));
                    return;
                  }

                  // Transaction finalized successfully
                  if (isResolved) {
                    return;
                  }
                  isResolved = true;

                  toast.success(
                    `Batch transaction finalized: https://${getSubscanSubdomain(
                      activeChain.name,
                    )}.subscan.io/extrinsic/${finalTxHash}`,
                    { id: toastId },
                  );
                  void sendMessage({
                    role: "assistant",
                    parts: [
                      {
                        type: "text",
                        text: `Batch transaction finalized in block #${String(blockNumber)} (${String(status.block.hash)}): https://${getSubscanSubdomain(
                          activeChain.name,
                        )}.subscan.io/extrinsic/${finalTxHash}`,
                      },
                    ],
                  });
                  if (subscriptionObj) {
                    subscriptionObj.unsubscribe();
                  }
                  activeBatchTxHash.current = null;
                  resolve(finalTxHash);
                }
              },
              error: (error: unknown) => {
                if (isResolved) {
                  return;
                }
                isResolved = true;

                const finalTxHash = txHash ?? "unknown";
                const id = `error-${finalTxHash}`;
                if (sentBatchMessages.current.has(id)) {
                  if (subscriptionObj) {
                    subscriptionObj.unsubscribe();
                  }
                  activeBatchTxHash.current = null;
                  reject(
                    error instanceof Error ? error : new Error(String(error)),
                  );
                  return;
                }
                sentBatchMessages.current.add(id);

                const errorMessage =
                  error instanceof Error ? error.message : "Unknown error";
                toast.error(
                  `Failed to send batch transaction: ${errorMessage}`,
                  {
                    id: toastId,
                  },
                );
                void sendMessage({
                  role: "assistant",
                  parts: [
                    {
                      type: "text",
                      text: `Batch transaction failed: ${errorMessage}`,
                    },
                  ],
                });
                if (subscriptionObj) {
                  subscriptionObj.unsubscribe();
                }
                activeBatchTxHash.current = null;
                reject(
                  error instanceof Error ? error : new Error(String(error)),
                );
              },
            });
          } catch (error) {
            activeBatchTxHash.current = null;
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            toast.error(`Failed to send batch transaction: ${errorMessage}`, {
              id: toastId,
            });
            void sendMessage({
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text: `Batch transaction failed: ${errorMessage}`,
                },
              ],
            });
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
      } finally {
        batchInProgress.current = false;
        // Don't clear sentBatchMessages here - let it persist to prevent duplicates
        // It will be cleared at the start of the next batch
      }
    },
    [api, selectedAccount, activeChain, buildTransactionCall],
  );

  const sendBatchAll = useCallback(
    async ({
      transactions,
      sendMessage,
    }: {
      transactions: BatchTransaction[];
      sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
    }): Promise<string | null> => {
      // Prevent multiple concurrent batchAll calls
      if (batchAllInProgress.current || activeBatchAllTxHash.current !== null) {
        // eslint-disable-next-line no-console
        console.log(
          "sendBatchAll: Already in progress, skipping duplicate call",
        );
        return null;
      }
      batchAllInProgress.current = true;

      // Clear sent messages for this new batchAll
      sentBatchAllMessages.current.clear();

      try {
        if (!api || !selectedAccount) {
          toast.error("Wallet not connected");
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: "Please connect your wallet first",
              },
            ],
          });
          return null;
        }

        const toastId = generateToastId();
        toast.loading("Processing BatchAll transaction...", { id: toastId });
        // Verify Utility pallet exists
        if (!api.tx.Utility) {
          toast.dismiss(toastId);
          throw new Error("Utility pallet not available on this chain");
        }

        if (!api.tx.Utility.batch_all) {
          toast.dismiss(toastId);
          throw new Error("batch_all method not available on Utility pallet");
        }

        // Build all transaction calls
        let rawCalls: any[];
        try {
          const callPromises = transactions.map((tx, index) => {
            // eslint-disable-next-line no-console
            console.log(
              `Building transaction ${String(index + 1)}/${String(transactions.length)}:`,
              tx,
            );
            return buildTransactionCall(tx);
          });

          rawCalls = await Promise.all(callPromises);
        } catch (error) {
          // Dismiss loading toast on build error
          toast.dismiss(toastId);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          // eslint-disable-next-line no-console
          console.error("Error building transactions:", error);
          toast.error(`Failed to build transactions: ${errorMessage}`);
          throw new Error(`Failed to build transactions: ${errorMessage}`);
        }

        // Filter out null calls
        const validCalls = rawCalls.filter((call) => call !== null);

        if (validCalls.length === 0) {
          toast.dismiss(toastId);
          throw new Error("No valid transactions to batch");
        }

        // Log successful builds
        validCalls.forEach((call, index) => {
          // eslint-disable-next-line no-console
          console.log(`Successfully built transaction ${String(index + 1)}:`, {
            hasDecodedCall: !!call?.decodedCall,
            callKeys: call ? Object.keys(call as Record<string, unknown>) : [],
            decodedCallType: call?.decodedCall?.type,
          });
        });

        // eslint-disable-next-line no-console
        console.log(
          `Built ${String(validCalls.length)}/${String(transactions.length)} transactions successfully`,
        );

        // Check for undefined/null calls
        const undefinedCalls = validCalls.filter(
          (call) => call === undefined || call === null,
        );
        if (undefinedCalls.length > 0) {
          // eslint-disable-next-line no-console
          console.error(
            "Found undefined/null calls in rawCalls:",
            undefinedCalls,
          );
          throw new Error(
            `Found ${String(undefinedCalls.length)} undefined/null calls in rawCalls. Cannot create batch_all transaction.`,
          );
        }

        // Debug log: Inspect validCalls before passing to batch_all
        // eslint-disable-next-line no-console
        console.log("validCalls before passing to batch_all:", validCalls);

        // Normalize calls: extract decodedCall if it exists, otherwise use call as-is
        const rawCallsForBatch = validCalls.map(
          (call) => call.decodedCall ?? call,
        );
        const batchAllTx = (api.tx.Utility.batch_all as any)({
          calls: rawCallsForBatch,
        });

        // Helper function to create subscription with status handling
        const createSubscription = (
          tx: any,
          isFallback = false,
        ): Promise<string> => {
          return new Promise<string>((resolve, reject) => {
            let txHash: string | null = null;
            let subscriptionObj: { unsubscribe: () => void } | null = null;
            let isResolved = false;

            try {
              const subscription = tx.signSubmitAndWatch(
                selectedAccount.polkadotSigner,
              );

              subscriptionObj = subscription.subscribe({
                next: (status: any) => {
                  // Early return if already resolved to prevent duplicate processing
                  if (isResolved) {
                    return;
                  }

                  // Set txHash as soon as we get it and track it
                  if (status.txHash && !txHash) {
                    txHash = String(status.txHash);
                    activeBatchAllTxHash.current = txHash;
                  }

                  // Handle different status types based on polkadot-api structure
                  const txType = isFallback ? "Batch" : "BatchAll";

                  if (status.type === "signed") {
                    txHash = txHash ?? String(status.txHash);
                    activeBatchAllTxHash.current = txHash;
                    const id = `signed-${txHash}`;

                    // Atomic check-and-add to prevent race conditions
                    if (sentBatchAllMessages.current.has(id)) {
                      return;
                    }
                    sentBatchAllMessages.current.add(id);

                    toast.loading(
                      `${txType} transaction signed: ${txHash}...`,
                      {
                        id: toastId,
                      },
                    );
                    // Only show toast, no chat message for signed status
                  } else if (status.type === "broadcasted") {
                    txHash ??= String(status.txHash);
                    activeBatchAllTxHash.current = txHash;
                    const id = `broadcasted-${txHash}`;

                    // Atomic check-and-add to prevent race conditions
                    if (sentBatchAllMessages.current.has(id)) {
                      return;
                    }
                    sentBatchAllMessages.current.add(id);

                    toast.loading(
                      `${txType} transaction broadcasted: ${txHash}...`,
                      { id: toastId },
                    );
                    // Only show toast, no chat message for broadcasted status
                  } else if (status.type === "txBestBlocksState") {
                    txHash ??= String(status.txHash);
                    activeBatchAllTxHash.current = txHash;

                    if (status.found) {
                      const blockNumber = status.block.number;
                      const id = `inblock-${txHash}-${blockNumber}`;

                      if (sentBatchAllMessages.current.has(id)) {
                        // Already sent, just update toast
                        toast.loading(
                          `${txType} transaction included in block #${String(blockNumber)}: ${String(status.block.hash)}...`,
                          { id: toastId },
                        );
                        return;
                      }
                      sentBatchAllMessages.current.add(id);

                      toast.loading(
                        `${txType} transaction included in block #${String(blockNumber)}: ${String(status.block.hash)}...`,
                        { id: toastId },
                      );
                      // Only show toast, no chat message for in-block status
                    } else {
                      // Transaction not found yet, but checking validity
                      toast.loading(
                        `${txType} transaction pending... (valid: ${status.isValid ? "yes" : "no"})`,
                        { id: toastId },
                      );
                    }
                  } else if (status.type === "finalized") {
                    const finalTxHash = txHash ?? String(status.txHash);
                    activeBatchAllTxHash.current = finalTxHash;
                    const blockNumber = status.block.number;
                    const id = `finalized-${finalTxHash}`;

                    if (sentBatchAllMessages.current.has(id)) {
                      // Already processed
                      return;
                    }
                    sentBatchAllMessages.current.add(id);

                    if (!status.ok) {
                      // Transaction finalized but failed
                      if (isResolved) {
                        return;
                      }
                      isResolved = true;

                      const errorMessage = status.dispatchError
                        ? JSON.stringify(status.dispatchError)
                        : "Transaction failed";
                      toast.error(
                        `${txType} transaction failed: ${errorMessage}`,
                        { id: toastId },
                      );
                      void sendMessage({
                        role: "assistant",
                        parts: [
                          {
                            type: "text",
                            text: `${txType} transaction finalized in block #${String(blockNumber)} but failed: ${errorMessage}. Hash: ${finalTxHash}`,
                          },
                        ],
                      });
                      if (subscriptionObj) {
                        subscriptionObj.unsubscribe();
                      }
                      activeBatchAllTxHash.current = null;
                      reject(new Error(errorMessage));
                      return;
                    }

                    // Transaction finalized successfully
                    if (isResolved) {
                      return;
                    }
                    isResolved = true;

                    toast.success(
                      `${txType} transaction finalized: https://${getSubscanSubdomain(
                        activeChain.name,
                      )}.subscan.io/extrinsic/${finalTxHash}`,
                      { id: toastId },
                    );
                    void sendMessage({
                      role: "assistant",
                      parts: [
                        {
                          type: "text",
                          text: `${txType} transaction finalized in block #${String(blockNumber)} (${String(status.block.hash)}): https://${getSubscanSubdomain(
                            activeChain.name,
                          )}.subscan.io/extrinsic/${finalTxHash}`,
                        },
                      ],
                    });
                    if (subscriptionObj) {
                      subscriptionObj.unsubscribe();
                    }
                    activeBatchAllTxHash.current = null;
                    resolve(finalTxHash);
                  }
                },
                error: (error: unknown) => {
                  if (isResolved) {
                    return;
                  }
                  isResolved = true;

                  const finalTxHash = txHash ?? "unknown";
                  const id = `error-${finalTxHash}`;
                  if (sentBatchAllMessages.current.has(id)) {
                    if (subscriptionObj) {
                      subscriptionObj.unsubscribe();
                    }
                    activeBatchAllTxHash.current = null;
                    reject(
                      error instanceof Error ? error : new Error(String(error)),
                    );
                    return;
                  }
                  sentBatchAllMessages.current.add(id);

                  const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";
                  const txType = isFallback ? "Batch" : "BatchAll";
                  toast.error(
                    `Failed to send ${txType} transaction: ${errorMessage}`,
                    { id: toastId },
                  );
                  void sendMessage({
                    role: "assistant",
                    parts: [
                      {
                        type: "text",
                        text: `${txType} transaction failed: ${errorMessage}`,
                      },
                    ],
                  });
                  if (subscriptionObj) {
                    subscriptionObj.unsubscribe();
                  }
                  activeBatchAllTxHash.current = null;
                  reject(
                    error instanceof Error ? error : new Error(String(error)),
                  );
                },
              });
            } catch (error) {
              activeBatchAllTxHash.current = null;
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              const txType = isFallback ? "Batch" : "BatchAll";
              toast.error(
                `Failed to send ${txType} transaction: ${errorMessage}`,
                { id: toastId },
              );
              void sendMessage({
                role: "assistant",
                parts: [
                  {
                    type: "text",
                    text: `${txType} transaction failed: ${errorMessage}`,
                  },
                ],
              });
              reject(error instanceof Error ? error : new Error(String(error)));
            }
          });
        };

        // Sign, submit, and watch transaction status
        // Note: There's a known encoding issue with batch_all in polkadot-api
        // If encoding fails, we'll fall back to batch (not atomic, but will work)
        try {
          return await createSubscription(batchAllTx, false);
        } catch (submitError) {
          const errorMessage =
            submitError instanceof Error
              ? submitError.message
              : "Unknown error";

          // Check if this is the known encoding error
          if (
            errorMessage.includes("inner[tag] is not a function") ||
            errorMessage.includes("tag") ||
            errorMessage.includes("encoding") ||
            errorMessage.includes("signSubmitAndWatch")
          ) {
            // eslint-disable-next-line no-console
            console.warn(
              "batch_all encoding failed (known polkadot-api issue), falling back to batch (not atomic)",
            );

            // Fallback to batch (not atomic, but will work)
            // Normalize calls: extract decodedCall if it exists, otherwise use call as-is
            const rawCallsForBatchFallback = validCalls.map(
              (call) => call.decodedCall ?? call,
            );
            // eslint-disable-next-line no-console
            console.log(
              "rawCallsForBatch before batch (fallback):",
              JSON.stringify(rawCallsForBatchFallback, null, 2),
            );
            const batchTx = (api.tx.Utility.batch as any)({
              calls: rawCallsForBatchFallback,
            });

            // Show warning toast
            toast.warning(
              "batch_all encoding failed. Using batch instead (not atomic - partial failures allowed).",
              { duration: 8000, id: toastId },
            );

            void sendMessage({
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text: "BatchAll encoding failed. Falling back to Batch (not atomic - partial failures allowed).",
                },
              ],
            });

            // Use batch with signSubmitAndWatch
            return await createSubscription(batchTx, true);
          } else {
            // Different error - rethrow
            // eslint-disable-next-line no-console
            console.error("Error during signSubmitAndWatch:", submitError);
            // eslint-disable-next-line no-console
            console.error("batchAllTx:", batchAllTx);
            // eslint-disable-next-line no-console
            console.error("validCalls:", validCalls);
            throw new Error(
              `Failed to sign and submit batchAll transaction: ${errorMessage}`,
            );
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error in sendBatchAll:", error);
        // eslint-disable-next-line no-console
        console.error(
          "Error stack:",
          error instanceof Error ? error.stack : "No stack",
        );
        // Error handling is done inside createSubscription, so we just rethrow here
        // The subscription's error handler will send the message
        throw error;
      } finally {
        batchAllInProgress.current = false;
        // Don't clear sentBatchAllMessages here - let it persist to prevent duplicates
        // It will be cleared at the start of the next batchAll
      }
    },
    [api, selectedAccount, activeChain, buildTransactionCall],
  );

  return {
    sendBatch,
    sendBatchAll,
  };
}
