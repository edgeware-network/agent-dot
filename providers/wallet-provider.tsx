"use client";

import { config } from "@/lib/wallet-config";
import type { Wallet } from "@reactive-dot/core/wallets.js";
import {
  ChainProvider,
  ReactiveDotProvider,
  useAccounts,
  useConnectedWallets,
  useWalletConnector,
  useWalletDisconnector,
  useWallets,
} from "@reactive-dot/react";
import type { PolkadotSigner } from "polkadot-api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

export interface WalletAccount {
  address: string;
  name?: string;
  polkadotSigner: PolkadotSigner;
  wallet: Wallet;
}

interface WalletContextType {
  isInitializing: boolean;
  selectedAccount: WalletAccount | null;
  setSelectedAccount: (account: WalletAccount) => void;
  availableWallets: Wallet[];
  connectedWallets: Wallet[];
  connectWallet: (wallet: Wallet) => Promise<void>;
  disconnectWallet: (wallet: Wallet) => Promise<void>;
  allAccounts: WalletAccount[];
  isWalletOpen: boolean;
  setIsWalletOpen: (open: boolean) => void;
  activeChainId: string;
  switchChain: (chainId: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const SELECTED_ACCOUNT_KEY = "agent-dot:selected-account";
const SELECTED_CHAIN_KEY = "agent-dot:selected-chain";

interface StoredAccount {
  walletId: string;
  address: string;
  name?: string;
}

function WalletProviderInner({
  children,
  chainId,
  onChainSwitch,
}: {
  children: ReactNode;
  chainId: string;
  onChainSwitch: (chainId: string) => void;
}) {
  const wallets = useWallets();
  const connectedWallets = useConnectedWallets();
  const accounts = useAccounts();

  const [, connectWallet] = useWalletConnector();
  const [, disconnectWallet] = useWalletDisconnector();

  // Start with false to match server render, then check if initialization is needed
  const [isInitializing, setIsInitializing] = useState(false);
  const [selectedAccount, setSelectedAccountState] =
    useState<WalletAccount | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const autoConnectAttemptedRef = useRef(false);
  const restoreAttemptedRef = useRef(false);
  const disconnectingRef = useRef<string | null>(null);
  const hasCheckedInitialization = useRef(false);

  // Convert @reactive-dot accounts to our WalletAccount format
  // Memoize to prevent infinite loops in useEffect
  const allAccounts: WalletAccount[] = useMemo(
    () =>
      accounts.map((account) => ({
        address: account.address,
        name: account.name,
        polkadotSigner: account.polkadotSigner,
        wallet: account.wallet,
      })),
    [accounts],
  );

  const setSelectedAccount = useCallback((account: WalletAccount | null) => {
    setSelectedAccountState(account);
    if (account) {
      const stored: StoredAccount = {
        walletId: account.wallet.id,
        address: account.address,
        name: account.name,
      };
      localStorage.setItem(SELECTED_ACCOUNT_KEY, JSON.stringify(stored));
      // Notify listeners (e.g., chat hook) immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("agent-dot:selected-account-changed", {
            detail: { address: account.address, name: account.name },
          }),
        );
      }
    } else {
      localStorage.removeItem(SELECTED_ACCOUNT_KEY);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("agent-dot:selected-account-changed", {
            detail: { address: undefined, name: undefined },
          }),
        );
      }
    }
  }, []);

  const handleConnectWallet = useCallback(
    async (wallet: Wallet) => {
      try {
        await connectWallet(wallet);
      } catch (error) {
        const err = error as Error;
        toast.error(`Failed to connect ${wallet.name}: ${err.message}`);
      }
    },
    [connectWallet],
  );

  const handleDisconnectWallet = useCallback(
    async (wallet: Wallet) => {
      // Prevent multiple simultaneous disconnect operations
      if (disconnectingRef.current === wallet.id) {
        return;
      }

      disconnectingRef.current = wallet.id;

      try {
        // Add timeout to prevent hanging
        const disconnectPromise = disconnectWallet(wallet);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error("Disconnect timeout"));
          }, 5000);
        });

        await Promise.race([disconnectPromise, timeoutPromise]);

        // If the disconnected wallet had the selected account, clear it
        if (selectedAccount?.wallet.id === wallet.id) {
          setSelectedAccountState(null);
          localStorage.removeItem(SELECTED_ACCOUNT_KEY);
        }
      } catch (error) {
        const err = error as Error;
        // Try alternative disconnect method if primary fails
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          if ((wallet as any).disconnect) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            await (wallet as any).disconnect();
          }
        } catch {
          // Ignore secondary disconnect errors
        }
        toast.error(
          `Failed to disconnect ${wallet.name}: ${err.message || "Unknown error"}`,
        );
      } finally {
        disconnectingRef.current = null;
      }
    },
    [disconnectWallet, selectedAccount],
  );

  // Check if initialization is needed on mount
  useEffect(() => {
    if (hasCheckedInitialization.current) return;
    hasCheckedInitialization.current = true;

    const stored = localStorage.getItem(SELECTED_ACCOUNT_KEY);
    // If there's a stored account, we need to wait for accounts to load
    if (stored && allAccounts.length === 0) {
      setIsInitializing(true);
    }
  }, [allAccounts]);

  // Restore selected account once accounts are available
  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    const stored = localStorage.getItem(SELECTED_ACCOUNT_KEY);
    // Nothing stored: finish initializing immediately
    if (!stored) {
      setIsInitializing(false);
      restoreAttemptedRef.current = true;
      return;
    }
    // Wait until accounts load before attempting restore
    if (allAccounts.length === 0) {
      return;
    }
    // If user already selected something this session, don't override it
    if (selectedAccount) {
      setIsInitializing(false);
      restoreAttemptedRef.current = true;
      return;
    }

    try {
      const { walletId, address, name } = JSON.parse(stored) as StoredAccount;
      // 1) Prefer exact match by wallet + address
      let restored = allAccounts.find(
        (acc) => acc.wallet.id === walletId && acc.address === address,
      );
      // 2) If not found (e.g., SS58 prefix changed), try wallet + name
      if (!restored && name) {
        restored = allAccounts.find(
          (acc) => acc.wallet.id === walletId && acc.name === name,
        );
      }
      if (restored) {
        setSelectedAccountState(restored);
        // Normalize storage with latest values
        const normalized: StoredAccount = {
          walletId: restored.wallet.id,
          address: restored.address,
          name: restored.name,
        };
        localStorage.setItem(SELECTED_ACCOUNT_KEY, JSON.stringify(normalized));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to restore selected account:", error);
      localStorage.removeItem(SELECTED_ACCOUNT_KEY);
    } finally {
      setIsInitializing(false);
      restoreAttemptedRef.current = true;
    }
  }, [allAccounts, selectedAccount]);

  // Auto-connect the previously used wallet on refresh before account restore
  useEffect(() => {
    if (autoConnectAttemptedRef.current) return;
    const stored = localStorage.getItem(SELECTED_ACCOUNT_KEY);
    if (!stored) return;

    try {
      const { walletId } = JSON.parse(stored) as StoredAccount;
      if (!walletId) return;

      const isAlreadyConnected = connectedWallets.some(
        (w) => w.id === walletId,
      );
      if (isAlreadyConnected) {
        autoConnectAttemptedRef.current = true;
        return;
      }

      const candidate = wallets.find((w) => w.id === walletId);
      if (!candidate) return;

      autoConnectAttemptedRef.current = true;
      void handleConnectWallet(candidate);
    } catch {
      // ignore
    }
  }, [wallets, connectedWallets, handleConnectWallet]);

  // Keep selected account valid; do not auto-select a new one
  useEffect(() => {
    if (isInitializing) return;
    if (!selectedAccount) return;
    const stillExists = allAccounts.some(
      (a) => a.address === selectedAccount.address,
    );
    if (!stillExists) {
      setSelectedAccountState(null);
      localStorage.removeItem(SELECTED_ACCOUNT_KEY);
    }
  }, [allAccounts, selectedAccount, isInitializing]);

  const switchChain = useCallback(
    (newChainId: string) => {
      onChainSwitch(newChainId);
    },
    [onChainSwitch],
  );

  return (
    <WalletContext.Provider
      value={{
        isInitializing,
        selectedAccount,
        setSelectedAccount,
        availableWallets: wallets,
        connectedWallets,
        connectWallet: handleConnectWallet,
        disconnectWallet: handleDisconnectWallet,
        allAccounts,
        isWalletOpen,
        setIsWalletOpen,
        activeChainId: chainId,
        switchChain,
      }}
    >
      {isInitializing ? (
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
            <p className="text-muted-foreground text-sm">Loading AgentDot...</p>
          </div>
        </div>
      ) : (
        <>{children}</>
      )}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  // CRITICAL: Check for SSR/static generation FIRST, before any hooks
  // This prevents React from trying to access context during build
  if (typeof window === "undefined") {
    return <>{children}</>;
  }

  // Restore chain from localStorage on mount
  const [activeChainId, setActiveChainId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SELECTED_CHAIN_KEY);
      return stored ?? "polkadot";
    }
    return "polkadot";
  });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChainSwitch = useCallback((chainId: string) => {
    setActiveChainId(chainId);
    // Persist chain selection
    if (typeof window !== "undefined") {
      localStorage.setItem(SELECTED_CHAIN_KEY, chainId);
    }
  }, []);

  // Before mount, render children directly to prevent hydration mismatches
  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <ReactiveDotProvider config={config}>
      <ChainProvider chainId={activeChainId}>
        <WalletProviderInner
          chainId={activeChainId}
          onChainSwitch={handleChainSwitch}
        >
          {children}
        </WalletProviderInner>
      </ChainProvider>
    </ReactiveDotProvider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
