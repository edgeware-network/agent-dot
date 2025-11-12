"use client";

import { useRefObject } from "@/hooks/use-ref-object";
import { getAccountBalance } from "@/lib/polkadot-api";
import { useWallet } from "@/providers/wallet-provider";
import { useEffect, useState } from "react";

export function useAccountBalance() {
  const { selectedAccount } = useWallet();
  const { apiRef, activeChainRef } = useRefObject();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!selectedAccount || !apiRef.current) {
      setBalance(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchBalance = async () => {
      try {
        const balanceValue = await getAccountBalance(
          selectedAccount.address,
          apiRef,
          activeChainRef,
        );
        if (isMounted) {
          setBalance(balanceValue);
          setIsLoading(false);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch balance:", error);
        if (isMounted) {
          setBalance(null);
          setIsLoading(false);
        }
      }
    };

    void fetchBalance();

    // Poll for balance updates every 10 seconds
    const interval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (isMounted && selectedAccount && apiRef.current) {
        void fetchBalance();
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedAccount, apiRef, activeChainRef]);

  return { balance, isLoading };
}
