"use client";

import { NavigationButton } from "@/components/account/navigation-button";
import { Identicon } from "@/components/identicon";
import { Button } from "@/components/ui/button";
import { ViewNavigationProps } from "@/components/ui/multi-view-dialog";
import { useRefObject } from "@/hooks/use-ref-object";
import { getAccountBalance } from "@/lib/polkadot-api";
import { convertAddressToChainFormat, trimAddress } from "@/lib/utils";
import { useWallet } from "@/providers/wallet-provider";
import { useEffect, useMemo, useState } from "react";
import { MdOutlineKeyboardDoubleArrowLeft } from "react-icons/md";
import { RiWalletLine } from "react-icons/ri";

function AccountInfo({
  address,
  name,
  balance,
}: {
  address: string;
  name: string;
  balance: string | null;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <Identicon className="h-10 w-10" value={address} size={32} />
      <div className="flex w-full flex-col items-start justify-center gap-1">
        <div className="flex items-center gap-1">
          <RiWalletLine className="h-4 w-4" />
          <span className="text-foreground truncate text-sm font-bold">
            {name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-info font-poppins text-xs font-medium tracking-tight">
            {trimAddress(address, 12)}
          </span>
          {balance && (
            <span className="text-info font-poppins text-xs font-semibold">
              {balance}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
export default function ViewSelectAccount({ previous }: ViewNavigationProps) {
  const { allAccounts, setSelectedAccount, setIsWalletOpen, connectedWallets } =
    useWallet();
  const { activeChainRef, apiRef } = useRefObject();
  const [balances, setBalances] = useState<Record<string, string>>({});

  // Group accounts by wallet - memoize to prevent unnecessary re-renders
  const accountsByWallet = useMemo(
    () =>
      connectedWallets.map((wallet) => ({
        wallet,
        accounts: allAccounts.filter((acc) => acc.wallet.id === wallet.id),
      })),
    [connectedWallets, allAccounts],
  );

  // Fetch balances for all accounts
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!apiRef.current || allAccounts.length === 0) return;

    const fetchBalances = async () => {
      const balanceMap: Record<string, string> = {};
      for (const account of allAccounts) {
        try {
          const balance = await getAccountBalance(
            account.address,
            apiRef,
            activeChainRef,
          );
          balanceMap[account.address] = balance;
        } catch {
          // Ignore errors for individual accounts
        }
      }
      setBalances(balanceMap);
    };

    void fetchBalances();
  }, [allAccounts, apiRef, activeChainRef]);

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center justify-between px-2">
        <span className="text-muted-foreground text-sm">
          Connected Accounts
        </span>
      </div>
      <div className="flex max-h-[45vh] grow flex-col gap-2 overflow-y-auto px-2 sm:max-h-[70vh]">
        {accountsByWallet.map(({ wallet, accounts }) => (
          <div key={wallet.id} className="flex flex-col gap-2">
            {accounts.map((account) => {
              // Convert address to active chain format for display
              const displayAddress = convertAddressToChainFormat(
                account.address,
                activeChainRef.current.name,
              );
              return (
                <Button
                  key={account.address}
                  className="font-manrope bg-background/10 border-border h-14 w-full cursor-pointer rounded-[0.6rem] border-2 p-2 hover:bg-[#252525]/50"
                  onClick={() => {
                    setSelectedAccount(account);
                    setIsWalletOpen(false);
                  }}
                >
                  <AccountInfo
                    address={displayAddress}
                    name={account.name ?? account.address}
                    balance={balances[account.address] ?? null}
                  />
                </Button>
              );
            })}
          </div>
        ))}
      </div>
      <NavigationButton
        Icon={MdOutlineKeyboardDoubleArrowLeft}
        text="Manage wallets"
        onClick={previous}
        disabled={!connectedWallets.length}
      />
    </div>
  );
}
