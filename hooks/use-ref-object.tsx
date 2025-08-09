"use client";

import { useSyncedRef } from "@/hooks/use-sync-ref";
import { AvailableApis, ChainConfig } from "@/papi-config";
import { ExtenstionContext } from "@/providers/extension-provider";
import { useLightClientApi } from "@/providers/light-client-provider";
import { useRpcApi } from "@/providers/rpc-api-provider";
import {
  InjectedExtension,
  InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import { use } from "react";

export function useRefObject() {
  const { api, activeChain, setActiveChain } = useLightClientApi();
  const {
    client,
    activeChain: activeRpcChain,
    setActiveChain: setActiveRpcChain,
  } = useRpcApi();
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
  const clientRef = useSyncedRef<typeof client>(client);
  const activeRpcChainRef = useSyncedRef<ChainConfig | null>(activeRpcChain);
  const setActiveRpcChainRef =
    useSyncedRef<typeof setActiveRpcChain>(setActiveRpcChain);

  return {
    activeChainRef,
    setActiveChainRef,
    apiRef,
    connectedAccountsRef,
    selectedAccountRef,
    setSelectedAccountRef,
    selectedExtensionsRef,
    clientRef,
    activeRpcChainRef,
    setActiveRpcChainRef,
  };
}
