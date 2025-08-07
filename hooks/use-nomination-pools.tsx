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
  return {
    join,
  };
}
