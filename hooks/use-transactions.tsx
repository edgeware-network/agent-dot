"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { TOKEN_DECIMALS } from "@/constants/chains";
import { convertAmountToPlancks, getSubscanSubdomain } from "@/lib/utils";
import { chainConfig } from "@/papi-config";
import { useWallet } from "@/providers/wallet-provider";
import { UseChatHelpers } from "@ai-sdk/react";
import {
  Builder,
  convertSs58,
  TChain,
  TCurrency,
  TSubstrateChain,
} from "@paraspell/sdk";
import { MultiAddress } from "@polkadot-api/descriptors";
import { useChainId, useTypedApi } from "@reactive-dot/react";
import { UIMessage } from "ai";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

export function useTransactions() {
  const chainId = useChainId();
  const api = useTypedApi();
  const activeChain =
    chainConfig.find((chain) => chain.key === chainId) ?? chainConfig[0];
  const { selectedAccount } = useWallet();
  const sentMessages = useRef(new Set<string>());

  // Helper function to generate unique toast IDs
  const generateToastId = () => {
    return `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  // Helper function to handle signSubmitAndWatch with status updates
  const createTransactionSubscription = useCallback(
    (
      tx: any,
      toastId: string,
      transactionName: string,
      sendMessage: UseChatHelpers<UIMessage>["sendMessage"],
      sentMessages: React.RefObject<Set<string>>,
    ): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        let txHash: string | null = null;
        let subscriptionObj: { unsubscribe: () => void } | null = null;

        try {
          const subscription = tx.signSubmitAndWatch(
            selectedAccount?.polkadotSigner,
          );

          subscriptionObj = subscription.subscribe({
            next: (status: any) => {
              // Set txHash as soon as we get it
              if (status.txHash && !txHash) {
                txHash = String(status.txHash);
              }

              if (status.type === "signed") {
                txHash = txHash ?? String(status.txHash);
                const id = `signed-${txHash}`;
                if (sentMessages.current.has(id)) return;
                sentMessages.current.add(id);

                toast.loading(
                  `${transactionName} transaction signed: ${txHash}...`,
                  {
                    id: toastId,
                  },
                );
                // Only show toast, no chat message for signed status
              } else if (status.type === "broadcasted") {
                txHash ??= String(status.txHash);
                const id = `broadcasted-${txHash}`;
                if (sentMessages.current.has(id)) return;
                sentMessages.current.add(id);

                toast.loading(
                  `${transactionName} transaction broadcasted: ${txHash}...`,
                  { id: toastId },
                );
                // Only show toast, no chat message for broadcasted status
              } else if (status.type === "txBestBlocksState") {
                txHash ??= String(status.txHash);

                if (status.found) {
                  const blockNumber = status.block.number;
                  const id = `inblock-${txHash}-${blockNumber}`;

                  if (sentMessages.current.has(id)) {
                    toast.loading(
                      `${transactionName} transaction included in block #${String(blockNumber)}: ${String(status.block.hash)}...`,
                      { id: toastId },
                    );
                    return;
                  }
                  sentMessages.current.add(id);

                  toast.loading(
                    `${transactionName} transaction included in block #${String(blockNumber)}: ${String(status.block.hash)}...`,
                    { id: toastId },
                  );
                  // Only show toast, no chat message for in-block status
                } else {
                  toast.loading(
                    `${transactionName} transaction pending... (valid: ${status.isValid ? "yes" : "no"})`,
                    { id: toastId },
                  );
                }
              } else if (status.type === "finalized") {
                const finalTxHash = txHash ?? String(status.txHash);
                const blockNumber = status.block.number;
                const id = `finalized-${finalTxHash}`;

                if (sentMessages.current.has(id)) {
                  return;
                }
                sentMessages.current.add(id);

                if (!status.ok) {
                  const errorMessage = status.dispatchError
                    ? JSON.stringify(status.dispatchError)
                    : "Transaction failed";
                  toast.error(
                    `${transactionName} transaction failed: ${errorMessage}`,
                    {
                      id: toastId,
                    },
                  );
                  void sendMessage({
                    role: "assistant",
                    parts: [
                      {
                        type: "text",
                        text: `${transactionName} transaction finalized in block #${String(blockNumber)} but failed: ${errorMessage}. Hash: ${finalTxHash}`,
                      },
                    ],
                  });
                  if (subscriptionObj) {
                    subscriptionObj.unsubscribe();
                  }
                  reject(new Error(errorMessage));
                  return;
                }

                toast.success(
                  `${transactionName} transaction finalized: https://${getSubscanSubdomain(
                    activeChain.name,
                  )}.subscan.io/extrinsic/${finalTxHash}`,
                  { id: toastId },
                );
                void sendMessage({
                  role: "assistant",
                  parts: [
                    {
                      type: "text",
                      text: `The ${transactionName} transaction has been successfully finalized in block #${String(blockNumber)}! You can view the transaction details here: https://${getSubscanSubdomain(
                        activeChain.name,
                      )}.subscan.io/extrinsic/${finalTxHash}`,
                    },
                  ],
                });
                if (subscriptionObj) {
                  subscriptionObj.unsubscribe();
                }
                resolve(finalTxHash);
              }
            },
            error: (error: unknown) => {
              const finalTxHash = txHash ?? "unknown";
              const id = `error-${finalTxHash}`;
              if (sentMessages.current.has(id)) {
                if (subscriptionObj) {
                  subscriptionObj.unsubscribe();
                }
                reject(
                  error instanceof Error ? error : new Error(String(error)),
                );
                return;
              }
              sentMessages.current.add(id);

              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              toast.error(
                `Failed to send ${transactionName} transaction: ${errorMessage}`,
                { id: toastId },
              );
              void sendMessage({
                role: "assistant",
                parts: [
                  {
                    type: "text",
                    text: `${transactionName} transaction failed: ${errorMessage}`,
                  },
                ],
              });
              if (subscriptionObj) {
                subscriptionObj.unsubscribe();
              }
              reject(error instanceof Error ? error : new Error(String(error)));
            },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          toast.error(
            `Failed to send ${transactionName} transaction: ${errorMessage}`,
            { id: toastId },
          );
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `${transactionName} transaction failed: ${errorMessage}`,
              },
            ],
          });
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    },
    [selectedAccount, activeChain],
  );

  const sendTransaction = useCallback(
    async ({
      to,
      amount,
      sendMessage,
    }: {
      to: string;
      amount: number;
      sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
    }) => {
      if (!api || !selectedAccount) {
        void sendMessage({
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Please connect your wallet first",
            },
          ],
        });
      }

      sentMessages.current.clear();
      const toastId = generateToastId();
      toast.loading(
        `Processing transaction of ${String(amount)} ${activeChain.chainSpec.properties.tokenSymbol} to ${to}`,
        { id: toastId },
      );

      if (api && selectedAccount) {
        const value =
          BigInt(amount) *
          10n ** BigInt(activeChain.chainSpec.properties.tokenDecimals);

        try {
          const tx = (api.tx.Balances.transfer_keep_alive as any)({
            dest: MultiAddress.Id(to),
            value,
          });

          await createTransactionSubscription(
            tx,
            toastId,
            "Transfer",
            sendMessage,
            sentMessages,
          );
        } catch (error: unknown) {
          const err = error as Error;

          toast.error(`Failed to send transaction: ${err.message}`, {
            id: toastId,
          });
          void sendMessage({
            text: `Failed to send transaction: ${err.message}`,
          });
        }
      }
    },
    [
      api,
      selectedAccount,
      activeChain,
      createTransactionSubscription,
      sentMessages,
    ],
  );

  const sendXcmTransaction = useCallback(
    async ({
      src,
      dst,
      amount,
      symbol,
      sender,
      recipient,
      sendMessage,
    }: {
      src: TSubstrateChain;
      dst: TSubstrateChain;
      amount: number;
      symbol: string;
      sender: string;
      recipient?: string;
      sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
    }) => {
      if (!selectedAccount) {
        void sendMessage({
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Please connect your wallet first",
            },
          ],
        });
      }

      sentMessages.current.clear();
      const toastId = generateToastId();
      toast.loading(
        `Processing XCM transaction of ${amount.toFixed(3)} ${symbol} from ${src} to ${dst}`,
        { id: toastId },
      );

      if (selectedAccount) {
        const amountInPlancks = convertAmountToPlancks(
          amount,
          TOKEN_DECIMALS[symbol],
        );
        let builder: any = null;
        try {
          builder = Builder()
            .from(src)
            .to(dst)
            .currency({ symbol: symbol, amount: amountInPlancks })
            .address(recipient ?? convertSs58(sender, dst))
            .senderAddress(sender);

          const tx = await builder.build();

          await createTransactionSubscription(
            tx,
            toastId,
            "XCM",
            sendMessage,
            sentMessages,
          );

          await builder.disconnect();
        } catch (error: unknown) {
          const err = error as Error;

          toast.error(`Failed to teleport xcm transaction: ${err.message}`, {
            id: toastId,
          });
        }
      }
    },
    [selectedAccount, createTransactionSubscription, sentMessages],
  );

  const sendXcmStablecoinTransaction = useCallback(
    async ({
      src,
      dst,
      amount,
      id,
      symbol,
      recipient,
      sendMessage,
    }: {
      src: TSubstrateChain;
      dst: TChain;
      amount: number;
      id: TCurrency;
      symbol: "USDT" | "USDC";
      recipient: string;
      sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
    }) => {
      if (!selectedAccount) {
        toast.error("Please connect your wallet first");
        void sendMessage({
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Please connect your wallet first",
            },
          ],
        });
      }

      sentMessages.current.clear();
      const toastId = generateToastId();
      toast.loading(
        `Processing XCM transaction of ${amount.toFixed(3)} ${symbol} from ${src} to ${dst}`,
        { id: toastId },
      );

      if (selectedAccount) {
        const amountInPlancks = convertAmountToPlancks(
          amount,
          TOKEN_DECIMALS[symbol],
        );
        let builder: any = null;
        try {
          builder = Builder()
            .from(src)
            .to(dst)
            .currency({ amount: amountInPlancks, id })
            .address(recipient)
            .senderAddress(selectedAccount.address);

          const tx = await builder.build();

          await createTransactionSubscription(
            tx,
            toastId,
            "XCM Stablecoin",
            sendMessage,
            sentMessages,
          );

          await builder.disconnect();
        } catch (error: unknown) {
          const err = error as Error;

          toast.error(`Failed to teleport xcm transaction: ${err.message}`, {
            id: toastId,
          });
        }
      }
    },
    [selectedAccount, createTransactionSubscription, sentMessages],
  );

  return { sendTransaction, sendXcmTransaction, sendXcmStablecoinTransaction };
}
