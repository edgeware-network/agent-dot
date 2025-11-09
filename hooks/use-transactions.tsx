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
import { useCallback } from "react";
import { toast } from "sonner";

export function useTransactions() {
  const chainId = useChainId();
  const api = useTypedApi();
  const activeChain =
    chainConfig.find((chain) => chain.key === chainId) ?? chainConfig[0];
  const { selectedAccount } = useWallet();

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
          const tx = await (api.tx.Balances.transfer_keep_alive as any)({
            dest: MultiAddress.Id(to),
            value,
          }).signAndSubmit(selectedAccount.polkadotSigner);

          if (!tx.ok) {
            throw new Error(
              `${tx.dispatchError.type}: ${JSON.stringify(tx.dispatchError.value, null, 2)}`,
            );
          }

          toast.success(
            `Transaction sent: https://${getSubscanSubdomain(activeChain.name)}.subscan.io/extrinsic/${tx.txHash}`,
            {
              id: toastId,
            },
          );

          void sendMessage({
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `Transaction sent: https://${getSubscanSubdomain(
                  activeChain.name,
                )}.subscan.io/extrinsic/${tx.txHash}`,
              },
            ],
          });
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
    [api, selectedAccount, activeChain],
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

      const toastId = toast.loading(
        `Processing XCM transaction of ${amount.toFixed(3)} ${symbol} from ${src} to ${dst}`,
      );

      if (selectedAccount) {
        const amountInPlancks = convertAmountToPlancks(
          amount,
          TOKEN_DECIMALS[symbol],
        );
        try {
          const builder = Builder()
            .from(src)
            .to(dst)
            .currency({ symbol: symbol, amount: amountInPlancks })
            .address(recipient ?? convertSs58(sender, dst))
            .senderAddress(sender);

          const tx = await builder.build();

          const xcm = await tx.signAndSubmit(selectedAccount.polkadotSigner);

          if (!xcm.ok) {
            throw new Error(
              `${xcm.dispatchError.type}: ${JSON.stringify(xcm.dispatchError.value, null, 2)}`,
            );
          }

          // BUG: might not for some chains src naming is different eg. peoplepolkadot is people-polkadot
          toast.success(
            `XCM transaction sent: https://${getSubscanSubdomain(src)}.subscan.io/extrinsic/${xcm.txHash}`,
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
                  text: `XCM transaction sent: https://${getSubscanSubdomain(
                    src,
                  )}.subscan.io/extrinsic/${xcm.txHash}`,
                },
              ],
            },
            { metadata: { xcm } },
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
    [selectedAccount, activeChain],
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

      const toastId = toast.loading(
        `Processing XCM transaction of ${amount.toFixed(3)} ${symbol} from ${src} to ${dst}`,
      );

      if (selectedAccount) {
        const amountInPlancks = convertAmountToPlancks(
          amount,
          TOKEN_DECIMALS[symbol],
        );
        try {
          const builder = Builder()
            .from(src)
            .to(dst)
            .currency({ amount: amountInPlancks, id })
            .address(recipient)
            .senderAddress(selectedAccount.address);

          const tx = await builder.build();

          const xcm = await tx.signAndSubmit(selectedAccount.polkadotSigner);

          if (!xcm.ok) {
            throw new Error(
              `${xcm.dispatchError.type}: ${JSON.stringify(xcm.dispatchError.value, null, 2)}`,
            );
          }

          toast.success(
            `XCM transaction sent: https://assethub-polkadot.subscan.io/extrinsic/${xcm.txHash}`,
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
                  text: `XCM transaction sent: https://assethub-polkadot.subscan.io/extrinsic/${xcm.txHash}`,
                },
              ],
            },
            { metadata: { xcm } },
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
    [selectedAccount],
  );

  return { sendTransaction, sendXcmTransaction, sendXcmStablecoinTransaction };
}
