"use client";

import { StakingDescriptors } from "@/lib/polkadot-api";
import { convertAmountToPlancks } from "@/lib/utils";
import { ExtenstionContext } from "@/providers/extension-provider";
import { useRpcApi } from "@/providers/rpc-api-provider";
import { UseChatHelpers } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { use, useCallback } from "react";
import { toast } from "sonner";

export function useNominationPools() {
  const { client, activeChain } = useRpcApi();
  const { selectedAccount } = use(ExtenstionContext);

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
        const toastId = toast.loading(
          `Processing the request to join nomination pool id ${poolId.toFixed(0)} with ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol}`,
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

          const tx = await nominatePoolTx.signAndSubmit(
            selectedAccount.polkadotSigner,
          );

          if (!tx.ok) {
            throw new Error(
              `${tx.dispatchError.type}: ${JSON.stringify(tx.dispatchError.value, null, 2)}`,
            );
          }

          toast.success(
            `Nomination pool id ${poolId.toFixed(0)} was successfully joined with ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol}. Transaction hash: ${tx.txHash}`,
            { id: toastId },
          );

          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Nomination pool id ${poolId.toFixed(0)} was successfully joined with ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol}. Transaction hash: ${tx.txHash}`,
              },
            ],
          });
        } catch (error) {
          const err = error as Error;
          toast.error(`Failed to join Nomination Pool: ${err.message}`, {
            id: toastId,
          });
          void sendMessage({
            text: `Failed to join Nomination Pool: ${err.message}`,
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
        const toastId = toast.loading(
          `Processing the request to bond extra to nomination pool with ${extra === "FreeBalance" && amount ? `${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol} from your free balance.` : extra === "Rewards" ? "rewards from your account." : ""}`,
        );
        try {
          const descriptors = activeChain.descriptors as StakingDescriptors;
          const api = client.getTypedApi(descriptors);
          if (extra === "Rewards") {
            const nominatePoolTx = api.tx.NominationPools.bond_extra({
              extra: { type: "Rewards", value: undefined },
            });
            const tx = await nominatePoolTx.signAndSubmit(
              selectedAccount.polkadotSigner,
            );

            if (!tx.ok) {
              throw new Error(
                `${tx.dispatchError.type}: ${JSON.stringify(tx.dispatchError.value, null, 2)}`,
              );
            }

            toast.success(
              `Nomination pool was successfully bonded with rewards. Transaction hash: ${tx.txHash}`,
              { id: toastId },
            );

            void sendMessage({
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text: `Nomination pool was successfully bonded with rewards. Transaction hash: ${tx.txHash}`,
                },
              ],
            });
          }
          if (extra === "FreeBalance" && amount) {
            const value = convertAmountToPlancks(
              amount,
              activeChain.chainSpec.properties.tokenDecimals,
            );
            const nominatePoolTx = api.tx.NominationPools.bond_extra({
              extra: { type: "FreeBalance", value: BigInt(value) },
            });
            const tx = await nominatePoolTx.signAndSubmit(
              selectedAccount.polkadotSigner,
            );

            if (!tx.ok) {
              throw new Error(
                `${tx.dispatchError.type}: ${JSON.stringify(tx.dispatchError.value, null, 2)}`,
              );
            }

            toast.success(
              `Nomination pool was successfully bonded with extra ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol}. Transaction hash: ${tx.txHash}`,
              { id: toastId },
            );

            void sendMessage({
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text: `Nomination pool was successfully bonded with extra ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol}. Transaction hash: ${tx.txHash}`,
                },
              ],
            });
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
            text: `Failed to bond extra to Nomination Pool: ${err.message}`,
          });
        }
      }
    },
    [selectedAccount],
  );

  return {
    join,
    bondExtraToPool,
  };
}
