"use client";

import { ExtenstionContext } from "@/providers/extension-provider";
import { useLightClientApi } from "@/providers/light-client-provider";
import {
  Builder,
  TNodeDotKsmWithRelayChains,
  convertSs58,
} from "@paraspell/sdk";
import { MultiAddress } from "@polkadot-api/descriptors";
import { use, useCallback } from "react";

export function useTransactions() {
  const { api, activeChain } = useLightClientApi();
  const { selectedAccount } = use(ExtenstionContext);

  const sendTransaction = useCallback(
    async ({ to, amount }: { to: string; amount: string }) => {
      if (api && selectedAccount) {
        const value =
          BigInt(amount) *
          10n ** BigInt(activeChain.chainSpec.properties.tokenDecimals);
        try {
          const tx = await api.tx.Balances.transfer_keep_alive({
            dest: MultiAddress.Id(to),
            value: value,
          }).signAndSubmit(selectedAccount.polkadotSigner);

          return {
            success: true,
            message: `https://${activeChain.name}.subscan.io/extrinsic/${tx.txHash}`,
          };
        } catch (error: unknown) {
          const err = error as Error;
          return {
            success: false,
            message: `Failed to prepare transfer: ${err.message}`,
          };
        }
      }

      return {
        success: false,
        message: "API or selected account is not available.",
      };
    },
    [api, selectedAccount, activeChain],
  );

  const sendXcmTransaction = useCallback(
    async ({
      from,
      to,
      amount,
      symbol,
      address,
    }: {
      from: TNodeDotKsmWithRelayChains;
      to: TNodeDotKsmWithRelayChains;
      amount: string;
      symbol: string;
      address: string;
    }): Promise<{ success: boolean; message: string }> => {
      if (selectedAccount) {
        try {
          const tx = await Builder()
            .from(from)
            .to(to)
            .currency({ symbol: symbol, amount: amount })
            .address(convertSs58(address, to))
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

  return { sendTransaction, sendXcmTransaction };
}
