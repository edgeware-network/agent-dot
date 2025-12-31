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
import { useCallback } from "react";
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

      const toastId = toast.loading("Processing Batch transaction...");

      try {
        // Build all transaction calls
        const callPromises = transactions.map((tx) => buildTransactionCall(tx));
        const rawCalls = await Promise.all(callPromises);

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

        // Sign and submit
        const tx = await batchTx.signAndSubmit(selectedAccount.polkadotSigner);

        if (!tx.ok) {
          throw new Error(
            `${String(tx.dispatchError.type)}: ${JSON.stringify(tx.dispatchError.value, null, 2)}`,
          );
        }

        const txHash = String(tx.txHash);
        toast.success(
          `Batch transaction sent: https://${getSubscanSubdomain(
            activeChain.name,
          )}.subscan.io/extrinsic/${txHash}`,
          {
            id: toastId,
          },
        );

        void sendMessage({
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `Batch transaction successful: https://${getSubscanSubdomain(
                activeChain.name,
              )}.subscan.io/extrinsic/${txHash}`,
            },
          ],
        });

        return txHash;
      } catch (error) {
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
        throw error;
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

      const toastId = toast.loading("Processing BatchAll transaction...");

      try {
        // Verify Utility pallet exists
        if (!api.tx.Utility) {
          throw new Error("Utility pallet not available on this chain");
        }

        if (!api.tx.Utility.batch_all) {
          throw new Error("batch_all method not available on Utility pallet");
        }

        // Build all transaction calls
        const callPromises = transactions.map((tx, index) => {
          // eslint-disable-next-line no-console
          console.log(
            `Building transaction ${String(index + 1)}/${String(transactions.length)}:`,
            tx,
          );
          return buildTransactionCall(tx);
        });

        const rawCalls = await Promise.all(callPromises);

        // Filter out null calls
        const validCalls = rawCalls.filter((call) => call !== null);

        if (validCalls.length === 0) {
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

        // Sign and submit
        // Note: There's a known encoding issue with batch_all in polkadot-api
        // If encoding fails, we'll fall back to batch (not atomic, but will work)
        let tx;
        try {
          tx = await batchAllTx.signAndSubmit(selectedAccount.polkadotSigner);
        } catch (submitError) {
          const errorMessage =
            submitError instanceof Error
              ? submitError.message
              : "Unknown error";

          // Check if this is the known encoding error
          if (
            errorMessage.includes("inner[tag] is not a function") ||
            errorMessage.includes("tag") ||
            errorMessage.includes("encoding")
          ) {
            // eslint-disable-next-line no-console
            console.warn(
              "batch_all encoding failed (known polkadot-api issue), falling back to batch (not atomic)",
            );

            // Fallback to batch (not atomic, but will work)
            // Normalize calls: extract decodedCall if it exists, otherwise use call as-is
            const rawCallsForBatch = validCalls.map(
              (call) => call.decodedCall ?? call,
            );
            // eslint-disable-next-line no-console
            console.log(
              "rawCallsForBatch before batch (fallback):",
              JSON.stringify(rawCallsForBatch, null, 2),
            );
            const batchTx = (api.tx.Utility.batch as any)({
              calls: rawCallsForBatch,
            });
            tx = await batchTx.signAndSubmit(selectedAccount.polkadotSigner);

            // Show warning toast
            toast.warning(
              "batch_all encoding failed. Used batch instead (not atomic - partial failures allowed).",
              { duration: 8000, id: toastId },
            );

            void sendMessage({
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text: `BatchAll transaction failed (fallback to Batch): ${errorMessage}`,
                },
              ],
            });
          } else {
            // Different error - rethrow
            // eslint-disable-next-line no-console
            console.error("Error during signAndSubmit:", submitError);
            // eslint-disable-next-line no-console
            console.error("batchAllTx:", batchAllTx);
            // eslint-disable-next-line no-console
            console.error("validCalls:", validCalls);
            throw new Error(
              `Failed to sign and submit batchAll transaction: ${errorMessage}`,
            );
          }
        }

        if (!tx.ok) {
          const errorType = tx.dispatchError?.type
            ? String(tx.dispatchError.type)
            : "Unknown";
          const errorValue = tx.dispatchError?.value
            ? JSON.stringify(tx.dispatchError.value, null, 2)
            : "No error details";
          throw new Error(`${errorType}: ${errorValue}`);
        }

        const txHash = String(tx.txHash);
        toast.success(
          `BatchAll transaction sent: https://${getSubscanSubdomain(
            activeChain.name,
          )}.subscan.io/extrinsic/${txHash}`,
          {
            id: toastId,
          },
        );

        void sendMessage({
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `BatchAll transaction successful: https://${getSubscanSubdomain(
                activeChain.name,
              )}.subscan.io/extrinsic/${txHash}`,
            },
          ],
        });

        return txHash;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error in sendBatchAll:", error);
        // eslint-disable-next-line no-console
        console.error(
          "Error stack:",
          error instanceof Error ? error.stack : "No stack",
        );
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to send batchAll transaction: ${errorMessage}`, {
          id: toastId,
        });

        void sendMessage({
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `BatchAll transaction failed: ${errorMessage}`,
            },
          ],
        });
        throw error;
      }
    },
    [api, selectedAccount, activeChain, buildTransactionCall],
  );

  return {
    sendBatch,
    sendBatchAll,
  };
}
