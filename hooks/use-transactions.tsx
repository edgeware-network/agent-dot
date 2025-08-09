"use client";

import { TOKEN_DECIMALS } from "@/constants/chains";
import { convertAmountToPlancks } from "@/lib/utils";
import { ExtenstionContext } from "@/providers/extension-provider";
import { useLightClientApi } from "@/providers/light-client-provider";
import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import {
  Builder,
  TCurrency,
  TNodeDotKsmWithRelayChains,
  TNodeWithRelayChains,
  convertSs58,
} from "@paraspell/sdk";
import { MultiAddress } from "@polkadot-api/descriptors";
import { use, useCallback } from "react";
import { toast } from "sonner";

export function useTransactions() {
  const { api, activeChain } = useLightClientApi();
  const { selectedAccount } = use(ExtenstionContext);

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

      const toastId = toast.loading(
        `Processing transaction of ${String(amount)} ${activeChain.chainSpec.properties.tokenSymbol} to ${to}`,
      );

      if (api && selectedAccount) {
        const value =
          BigInt(amount) *
          10n ** BigInt(activeChain.chainSpec.properties.tokenDecimals);

        try {
          const tx = await api.tx.Balances.transfer_keep_alive({
            dest: MultiAddress.Id(to),
            value,
          }).signAndSubmit(selectedAccount.polkadotSigner);

          toast.success(
            `Transaction sent: https://${activeChain.name.toLowerCase()}.subscan.io/extrinsic/${tx.txHash}`,
            {
              id: toastId,
            },
          );

          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Transaction sent: https://${activeChain.name.toLowerCase()}.subscan.io/extrinsic/${tx.txHash}`,
              },
            ],
          });
        } catch (error: unknown) {
          const err = error as Error;

          toast.error(`Failed to sign transaction: ${err.message}`, {
            id: toastId,
          });
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Failed to sign transaction: ${err.message}`,
              },
            ],
          });
        }
      }
    },
    [api, selectedAccount, activeChain],
  );

  const sendXcmTransaction = useCallback(
    async ({
      src,
      dst,
      amount,
      symbol,
      sender,
      sendMessage,
    }: {
      src: TNodeDotKsmWithRelayChains;
      dst: TNodeDotKsmWithRelayChains;
      amount: number;
      symbol: string;
      sender: string;
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

      const toastId = toast.loading(
        `Processing XCM transaction of ${amount.toFixed(3)} ${symbol} from ${src} to ${dst}`,
      );

      if (selectedAccount) {
        const amountInPlancks = convertAmountToPlancks(
          amount,
          TOKEN_DECIMALS[symbol],
        );
        try {
          const tx = await Builder()
            .from(src)
            .to(dst)
            .currency({ symbol: symbol, amount: amountInPlancks })
            .address(convertSs58(sender, dst))
            .senderAddress(sender)
            .build();

          const xcm = await tx.signAndSubmit(selectedAccount.polkadotSigner);

          // BUG: might not for some chains src naming is different eg. peoplepolkadot is people-polkadot
          toast.success(
            `XCM transaction sent: https://${src.toLowerCase()}.subscan.io/extrinsic/${xcm.txHash}`,
            {
              id: toastId,
            },
          );

          void sendMessage(
            {
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text: `XCM transaction sent: https://${src.toLowerCase()}.subscan.io/extrinsic/${xcm.txHash}`,
                },
              ],
            },
            { metadata: { xcm } },
          );
        } catch (error: unknown) {
          const err = error as Error;

          toast.error(`Failed to sign xcm transaction: ${err.message}`, {
            id: toastId,
          });
          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Failed to sign xcm transaction: ${err.message}`,
              },
            ],
          });
        }
      }
    },
    [selectedAccount, activeChain],
  );

  const sendXcmStablecoinTransaction = useCallback(
    async ({
      from,
      to,
      amount,
      id,
      address,
    }: {
      from: TNodeDotKsmWithRelayChains;
      to: TNodeWithRelayChains;
      amount: string;
      id: TCurrency;
      address: string;
    }): Promise<{ success: boolean; message: string }> => {
      if (selectedAccount) {
        try {
          const tx = await Builder()
            .from(from)
            .to(to)
            .currency({ id: id, amount: amount })
            .address(address)
            .build();
          const xcm = await tx.signAndSubmit(selectedAccount.polkadotSigner);

          return {
            success: true,
            message: `https://${activeChain.name.toLowerCase()}.subscan.io/extrinsic/${xcm.txHash}`,
          };
        } catch (error: unknown) {
          const err = error as Error;
          return {
            success: false,
            message: `Failed to send xcm transaction: ${err.message}`,
          };
        }
      }

      return {
        success: false,
        message: "Selected account is not available.",
      };
    },
    [selectedAccount, activeChain],
  );

  return { sendTransaction, sendXcmTransaction, sendXcmStablecoinTransaction };
}
