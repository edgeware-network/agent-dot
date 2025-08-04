"use client";

import { ChainConfig, AvailableApis } from "@/papi-config";
import { ExtenstionContext } from "@/providers/extension-provider";
import { useLightClientApi } from "@/providers/light-client-provider";
import {
  InjectedPolkadotAccount,
  InjectedExtension,
} from "polkadot-api/pjs-signer";
import { use } from "react";
import { useSyncedRef } from "./use-sync-ref";

export function useRefObject() {
  const { api, activeChain, setActiveChain } = useLightClientApi();
  const {
    connectedAccounts,
    selectedAccount,
    setSelectedAccount,
    selectedExtensions,
  } = use(ExtenstionContext);

  // refs to pass down to useChat
  const activeChainRef = useSyncedRef<ChainConfig>(activeChain);
  const setActiveChainRef = useSyncedRef<typeof setActiveChain>(setActiveChain);
  const apiRef = useSyncedRef<AvailableApis | null>(api);
  const connectedAccountsRef =
    useSyncedRef<InjectedPolkadotAccount[]>(connectedAccounts);
  const selectedAccountRef = useSyncedRef<
    | (InjectedPolkadotAccount & {
        extension: InjectedExtension;
      })
    | null
  >(selectedAccount);
  const setSelectedAccountRef =
    useSyncedRef<typeof setSelectedAccount>(setSelectedAccount);
  const selectedExtensionsRef =
    useSyncedRef<InjectedExtension[]>(selectedExtensions);

  return {
    activeChainRef,
    setActiveChainRef,
    apiRef,
    connectedAccountsRef,
    selectedAccountRef,
    setSelectedAccountRef,
    selectedExtensionsRef,
  };
}
