"use client";

import { StakingDescriptors } from "@/lib/polkadot-api";
import { convertAmountToPlancks } from "@/lib/utils";
import { ExtenstionContext } from "@/providers/extension-provider";
import { useRpcApi } from "@/providers/rpc-api-provider";
import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { use, useCallback } from "react";
import { toast } from "sonner";

export function useStaking() {
  const { client, activeChain } = useRpcApi();
  const { selectedAccount } = use(ExtenstionContext);

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
        const toastId = toast.loading(
          `Processing the bond transaction of ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol} to ${payee.type}`,
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

            const tx = await bondTx.signAndSubmit(
              selectedAccount.polkadotSigner,
            );

            toast.success(
              `Bond transaction of ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol} to ${payee.type}: ${payee.value} was successfully submitted. Transaction hash: ${tx.txHash}`,
              {
                id: toastId,
              },
            );

            void sendMessage({
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text: `Bond transaction of ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol} to ${payee.type}: ${payee.value} was successfully submitted. Transaction hash: ${tx.txHash}`,
                },
              ],
            });
          }

          if (payee.type !== "Account") {
            const bondTx = api.tx.Staking.bond({
              payee: { type: payee.type, value: undefined },
              value,
            });

            const tx = await bondTx.signAndSubmit(
              selectedAccount.polkadotSigner,
            );

            toast.success(
              `Bond transaction of ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol} to ${payee.type} was successfully submitted. Transaction hash: ${tx.txHash}`,
              {
                id: toastId,
              },
            );

            void sendMessage({
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text: `Bond transaction of ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol} to ${payee.type} was successfully submitted. Transaction hash: ${tx.txHash}`,
                },
              ],
            });
          }
        } catch (e) {
          const errorMessage =
            e instanceof Error ? e.message : "An unknown error occurred.";
          toast.error(`Failed to bond: ${errorMessage}`, {
            id: toastId,
          });

          void sendMessage({
            text: `Failed to bond: ${errorMessage}`,
          });
        }
      }
    },
    [selectedAccount],
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
        const toastId = toast.loading(
          `Processing the unbonding transaction of ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol}`,
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
          const tx = await api.tx.Staking.unbond({ value }).signAndSubmit(
            selectedAccount.polkadotSigner,
          );

          toast.success(
            `Unbond transaction of ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol} was successfully submitted. Transaction hash: ${tx.txHash}`,
            {
              id: toastId,
            },
          );

          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Unbond transaction of ${amount.toFixed(2)} ${activeChain.chainSpec.properties.tokenSymbol} was successfully submitted. Transaction hash: ${tx.txHash}`,
              },
            ],
          });
        } catch (e) {
          const errorMessage =
            e instanceof Error ? e.message : "An unknown error occurred.";
          toast.error(`Failed to unbond: ${errorMessage}`, {
            id: toastId,
          });

          void sendMessage({
            text: `Failed to unbond: ${errorMessage}`,
          });
        }
      }
    },
    [selectedAccount],
  );

  return {
    bond,
    unbond,
  };
}
