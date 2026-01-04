"use client";

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { StakingDescriptors } from "@/lib/polkadot-api";
import { convertAmountToPlancks, getSubscanSubdomain } from "@/lib/utils";
import { chainConfig } from "@/papi-config";
import { useWallet } from "@/providers/wallet-provider";
import { UseChatHelpers } from "@ai-sdk/react";
import { MultiAddress } from "@polkadot-api/descriptors";
import { useChainId, useClient } from "@reactive-dot/react";
import { UIMessage } from "ai";
import { useCallback } from "react";
import { toast } from "sonner";

export function useNominationPools() {
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

  const join = useCallback(
    async ({
      poolId,
      amount,
      sendMessage,
    }: {
      poolId: number;
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
          `Processing the request to join nomination pool id ${poolId.toFixed(0)} with ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol}`,
          { id: toastId },
        );
        try {
          const value = convertAmountToPlancks(
            amount,
            activeChain.chainSpec.properties.tokenDecimals,
          );
          const descriptors = activeChain.descriptors as StakingDescriptors;
          const api = client.getTypedApi(descriptors);

          const nominatePoolTx = api.tx.NominationPools.join({
            pool_id: poolId,
            amount: BigInt(value),
          });

          await createTransactionSubscription(
            nominatePoolTx,
            toastId,
            "Join Pool",
            sendMessage,
          );
        } catch (error) {
          const err = error as Error;
          toast.error(`Failed to join Nomination Pool: ${err.message}`, {
            id: toastId,
          });
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Failed to join nomination pool: ${err.message}. Please check your balance, ensure you're on the correct AssetHub chain, and verify the pool ID is valid.`,
              },
            ],
          });
        }
      }
    },
    [selectedAccount],
  );

  const bondExtraToPool = useCallback(
    async ({
      extra,
      amount,
      sendMessage,
    }: {
      extra: "FreeBalance" | "Rewards";
      amount: number | undefined;
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
          `Processing the request to bond extra to nomination pool with ${extra === "FreeBalance" && amount ? `${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol} from your free balance.` : extra === "Rewards" ? "rewards from your account." : ""}`,
          { id: toastId },
        );
        try {
          const descriptors = activeChain.descriptors as StakingDescriptors;
          const api = client.getTypedApi(descriptors);
          if (extra === "Rewards") {
            const nominatePoolTx = api.tx.NominationPools.bond_extra({
              extra: { type: "Rewards", value: undefined },
            });

            await createTransactionSubscription(
              nominatePoolTx,
              toastId,
              "Bond Extra Pool",
              sendMessage,
            );
          }
          if (extra === "FreeBalance" && amount) {
            const value = convertAmountToPlancks(
              amount,
              activeChain.chainSpec.properties.tokenDecimals,
            );
            const nominatePoolTx = api.tx.NominationPools.bond_extra({
              extra: { type: "FreeBalance", value: BigInt(value) },
            });

            await createTransactionSubscription(
              nominatePoolTx,
              toastId,
              "Bond Extra Pool",
              sendMessage,
            );
          }
        } catch (error) {
          const err = error as Error;
          toast.error(
            `Failed to bond extra to Nomination Pool: ${err.message}`,
            {
              id: toastId,
            },
          );
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Failed to bond extra to nomination pool: ${err.message}. Please check your balance, ensure you're a member of a pool, and verify you're on the correct AssetHub chain.`,
              },
            ],
          });
        }
      }
    },
    [selectedAccount, createTransactionSubscription],
  );

  const unbondFromPool = useCallback(
    async ({
      member,
      value,
      sendMessage,
    }: {
      member: string;
      value: number;
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
          `Processing the request to unbond nomination pool member ${member} with ${value.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol}`,
          { id: toastId },
        );
        try {
          const unbondingpoints = convertAmountToPlancks(
            value,
            activeChain.chainSpec.properties.tokenDecimals,
          );
          const descriptors = activeChain.descriptors as StakingDescriptors;
          const api = client.getTypedApi(descriptors);

          const nominatePoolTx = api.tx.NominationPools.unbond({
            member_account: MultiAddress.Id(member),
            unbonding_points: BigInt(unbondingpoints),
          });

          await createTransactionSubscription(
            nominatePoolTx,
            toastId,
            "Unbond Pool",
            sendMessage,
          );
        } catch (error) {
          const err = error as Error;
          toast.error(`Failed to unbond from Nomination Pool: ${err.message}`, {
            id: toastId,
          });
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Failed to unbond from nomination pool: ${err.message}. Please check that you're a member of a pool, have sufficient bonded amount, and are on the correct AssetHub chain.`,
              },
            ],
          });
        }
      }
    },
    [selectedAccount, createTransactionSubscription],
  );

  return {
    join,
    bondExtraToPool,
    unbondFromPool,
  };
}
