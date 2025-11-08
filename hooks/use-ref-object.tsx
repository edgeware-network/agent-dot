"use client";

import { useSyncedRef } from "@/hooks/use-sync-ref";
import { chainConfig, type ChainConfig } from "@/papi-config";
import { useWallet, type WalletAccount } from "@/providers/wallet-provider";
import { useChainId, useClient, useTypedApi } from "@reactive-dot/react";
import { useEffect, useState } from "react";

export function useRefObject() {
  const client = useClient();
  const chainId = useChainId();
  const api = useTypedApi();

  // Get active chain config from chainId
  const activeChain =
    chainConfig.find((chain) => chain.key === chainId) ?? chainConfig[0];

  const {
    allAccounts,
    selectedAccount,
    setSelectedAccount,
    connectedWallets,
    switchChain,
  } = useWallet();

  // Chain switching function that uses reactive-dot's switchChain
  const setActiveChain = (chain: ChainConfig) => {
    switchChain(chain.key);
  };

  // refs to pass down to useChat
  const activeChainRef = useSyncedRef<ChainConfig>(activeChain);
  const setActiveChainRef = useSyncedRef<typeof setActiveChain>(setActiveChain);
  const apiRef = useSyncedRef<typeof api>(api);
  const connectedAccountsRef = useSyncedRef<WalletAccount[]>(allAccounts);
  const selectedAccountRef = useSyncedRef<WalletAccount | null>(
    selectedAccount,
  );
  const setSelectedAccountRef =
    useSyncedRef<typeof setSelectedAccount>(setSelectedAccount);
  const selectedExtensionsRef =
    useSyncedRef<typeof connectedWallets>(connectedWallets);
  const clientRef = useSyncedRef<typeof client>(client);

  const activeRpcChainRef = useSyncedRef<ChainConfig>(activeChain);
  const setActiveRpcChainRef =
    useSyncedRef<typeof setActiveChain>(setActiveChain);

  // Force this hook to re-render immediately when side-tab selection changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectionVersion, setSelectionVersion] = useState(0);
  useEffect(() => {
    const handler = () => {
      setSelectionVersion((v) => v + 1);
    };
    window.addEventListener("agent-dot:selected-account-changed", handler);
    return () => {
      window.removeEventListener("agent-dot:selected-account-changed", handler);
    };
  }, []);

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
