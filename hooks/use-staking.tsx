"use client";

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { StakingDescriptors } from "@/lib/polkadot-api";
import { convertAmountToPlancks } from "@/lib/utils";
import { useWallet } from "@/providers/wallet-provider";
import { useClient, useChainId } from "@reactive-dot/react";
import { chainConfig } from "@/papi-config";
import { UseChatHelpers } from "@ai-sdk/react";
import { MultiAddress } from "@polkadot-api/descriptors";
import { UIMessage } from "ai";
import { useCallback } from "react";
import { toast } from "sonner";
import { getSubscanSubdomain } from "@/lib/utils";

export function useStaking() {
  const client = useClient();
  const chainId = useChainId();
  const activeChain =
    chainConfig.find((chain) => chain.key === chainId) ?? chainConfig[0];
  const { selectedAccount } = useWallet();

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
    ): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        let txHash: string | null = null;
        let subscriptionObj: { unsubscribe: () => void } | null = null;
        const sentMessages = new Set<string>();

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
                if (sentMessages.has(id)) return;
                sentMessages.add(id);

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
                if (sentMessages.has(id)) return;
                sentMessages.add(id);

                toast.loading(
                  `${transactionName} transaction broadcasted: ${txHash}...`,
                  { id: toastId },
                );
                // Only show toast, no chat message for broadcasted status
              } else if (status.type === "txBestBlocksState") {
                txHash ??= String(status.txHash);

                if (status.found) {
                  const blockHash = String(status.block.hash);
                  const blockNumber = status.block.number;
                  const id = `inblock-${txHash}-${blockNumber}`;

                  if (sentMessages.has(id)) {
                    toast.loading(
                      `${transactionName} transaction included in block #${String(blockNumber)}: ${blockHash}...`,
                      { id: toastId },
                    );
                    return;
                  }
                  sentMessages.add(id);

                  toast.loading(
                    `${transactionName} transaction included in block #${String(blockNumber)}: ${blockHash}...`,
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
                const blockHash = String(status.block.hash);
                const blockNumber = status.block.number;
                const id = `finalized-${finalTxHash}`;

                if (sentMessages.has(id)) {
                  return;
                }
                sentMessages.add(id);

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
                      text: `${transactionName} transaction finalized in block #${String(blockNumber)} (${blockHash}): https://${getSubscanSubdomain(
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
              if (sentMessages.has(id)) {
                if (subscriptionObj) {
                  subscriptionObj.unsubscribe();
                }
                reject(
                  error instanceof Error ? error : new Error(String(error)),
                );
                return;
              }
              sentMessages.add(id);

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

  const bond = useCallback(
    async ({
      payee,
      amount,
      sendMessage,
    }: {
      payee: {
        type: "Staked" | "Stash" | "Controller" | "Account" | "None";
        value: string | undefined;
      };
      amount: number;
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

      if (selectedAccount && client && activeChain) {
        const toastId = generateToastId();
        toast.loading(
          `Processing the bond transaction of ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol} to ${payee.type}`,
          { id: toastId },
        );
        try {
          const value = BigInt(
            convertAmountToPlancks(
              amount,
              activeChain.chainSpec.properties.tokenDecimals,
            ),
          );
          const descriptors = activeChain.descriptors as StakingDescriptors;
          const api = client.getTypedApi(descriptors);
          if (payee.type === "Account" && payee.value) {
            const bondTx = api.tx.Staking.bond({
              payee: { type: "Account", value: payee.value },
              value,
            });

            await createTransactionSubscription(
              bondTx,
              toastId,
              "Bond",
              sendMessage,
            );
          }

          if (payee.type !== "Account") {
            const bondTx = api.tx.Staking.bond({
              payee: { type: payee.type, value: undefined },
              value,
            });

            await createTransactionSubscription(
              bondTx,
              toastId,
              "Bond",
              sendMessage,
            );
          }
        } catch (e) {
          const errorMessage =
            e instanceof Error ? e.message : "An unknown error occurred.";
          toast.error(`Failed to bond: ${errorMessage}`, {
            id: toastId,
          });
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Failed to bond: ${errorMessage}. Please check your balance, ensure you're on the correct AssetHub chain, and verify all parameters are correct.`,
              },
            ],
          });
        }
      }
    },
    [selectedAccount, createTransactionSubscription],
  );

  const unbond = useCallback(
    async ({
      amount,
      sendMessage,
    }: {
      amount: number;
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

      if (selectedAccount && client && activeChain) {
        const toastId = generateToastId();
        toast.loading(
          `Processing the unbonding transaction of ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol}`,
          { id: toastId },
        );
        try {
          const value = BigInt(
            convertAmountToPlancks(
              amount,
              activeChain.chainSpec.properties.tokenDecimals,
            ),
          );
          const descriptors = activeChain.descriptors as StakingDescriptors;
          const api = client.getTypedApi(descriptors);
          const unbondTx = api.tx.Staking.unbond({ value });

          await createTransactionSubscription(
            unbondTx,
            toastId,
            "Unbond",
            sendMessage,
          );
        } catch (e) {
          const errorMessage =
            e instanceof Error ? e.message : "An unknown error occurred.";
          toast.error(`Failed to unbond: ${errorMessage}`, {
            id: toastId,
          });
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Failed to unbond: ${errorMessage}. Please check that you have sufficient bonded amount and are on the correct AssetHub chain.`,
              },
            ],
          });
        }
      }
    },
    [selectedAccount, createTransactionSubscription],
  );

  const bondExtra = useCallback(
    async ({
      amount,
      sendMessage,
    }: {
      amount: number;
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

      if (selectedAccount && client && activeChain) {
        const toastId = generateToastId();
        toast.loading(
          `Processing the bond extra transaction of ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol}`,
          { id: toastId },
        );
        try {
          const maxAdditional = BigInt(
            convertAmountToPlancks(
              amount,
              activeChain.chainSpec.properties.tokenDecimals,
            ),
          );
          const descriptors = activeChain.descriptors as StakingDescriptors;
          const api = client.getTypedApi(descriptors);
          const bondExtraTx = api.tx.Staking.bond_extra({
            max_additional: maxAdditional,
          });

          await createTransactionSubscription(
            bondExtraTx,
            toastId,
            "Bond Extra",
            sendMessage,
          );
        } catch (e) {
          const errorMessage =
            e instanceof Error ? e.message : "An unknown error occurred.";
          toast.error(`Failed to bond extra: ${errorMessage}`, {
            id: toastId,
          });
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Failed to bond extra: ${errorMessage}. Please check your balance and ensure you have an existing bond on the correct AssetHub chain.`,
              },
            ],
          });
        }
      }
    },
    [selectedAccount, client, activeChain, createTransactionSubscription],
  );

  const nominate = useCallback(
    async ({
      targets,
      sendMessage,
    }: {
      targets: string[];
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

      if (selectedAccount && client && activeChain) {
        const toastId = generateToastId();
        toast.loading(
          `Processing the nomination transaction of ${targets.length.toFixed(0)} validators on ${activeChain.key} network`,
          { id: toastId },
        );
        try {
          const descriptors = activeChain.descriptors as StakingDescriptors;
          const api = client.getTypedApi(descriptors);
          const nominateTx = api.tx.Staking.nominate({
            targets: targets.map((target) => MultiAddress.Id(target)),
          });

          await createTransactionSubscription(
            nominateTx,
            toastId,
            "Nominate",
            sendMessage,
          );
        } catch (e) {
          const errorMessage =
            e instanceof Error ? e.message : "An unknown error occurred.";
          toast.error(`Failed to nominate: ${errorMessage}`, {
            id: toastId,
          });
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Failed to nominate validators: ${errorMessage}. Please check that you have bonded stake, the validator addresses are valid, and you're on the correct AssetHub chain.`,
              },
            ],
          });
        }
      }
    },
    [selectedAccount, createTransactionSubscription],
  );

  return {
    bond,
    bondExtra,
    unbond,
    nominate,
  };
}
