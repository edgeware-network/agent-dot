"use client";

import { useSyncedRef } from "@/hooks/use-sync-ref";
import { AvailableApis, ChainConfig } from "@/papi-config";
import { ExtensionContext } from "@/providers/extension-provider";
import { useLightClientApi } from "@/providers/light-client-provider";
import { useRpcApi } from "@/providers/rpc-api-provider";
import { createClient, PolkadotClient } from "polkadot-api";
import {
  InjectedExtension,
  InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import { getWsProvider } from "polkadot-api/ws-provider";
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
  } = use(ExtensionContext);

  let assetHubClient: PolkadotClient | null = null;

  if (
    activeChain.name.toLowerCase().includes("paseo") ||
    activeChain.name.toLowerCase().includes("kusama") ||
    activeChain.name.toLowerCase().includes("westend")
  ) {
    const assetHubRpc = activeChain.name.toLowerCase().includes("paseo")
      ? "wss://sys.turboflakes.io/asset-hub-paseo"
      : activeChain.name.toLowerCase().includes("kusama")
        ? "wss://rpc-asset-hub-kusama.luckyfriday.io"
        : activeChain.name.toLowerCase().includes("westend")
          ? "wss://asset-hub-westend.rpc.permanence.io"
          : "wss://asset-hub-polkadot-rpc.n.dwellir.com";
    const provider = getWsProvider([assetHubRpc]);
    assetHubClient = createClient(provider);
  }

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
  const assetHubClientRef = useSyncedRef<typeof assetHubClient>(assetHubClient);
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
    assetHubClientRef,
    activeRpcChainRef,
    setActiveRpcChainRef,
  };
}
