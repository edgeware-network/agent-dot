"use client";

import { NavigationButton } from "@/components/account/navigation-button";
import { Identicon } from "@/components/identicon";
import { Button } from "@/components/ui/button";
import { ViewNavigationProps } from "@/components/ui/multi-view-dialog";
import { trimAddress } from "@/lib/utils";
import { useWallet } from "@/providers/wallet-provider";
import { MdOutlineKeyboardDoubleArrowLeft } from "react-icons/md";
import { RiWalletLine } from "react-icons/ri";

function AccountInfo({ address, name }: { address: string; name: string }) {
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
        <span className="text-info font-poppins text-xs font-medium tracking-tight">
          {trimAddress(address, 12)}
        </span>
      </div>
    </div>
  );
}
export default function ViewSelectAccount({ previous }: ViewNavigationProps) {
  const { allAccounts, setSelectedAccount, setIsWalletOpen, connectedWallets } =
    useWallet();

  // Group accounts by wallet
  const accountsByWallet = connectedWallets.map((wallet) => ({
    wallet,
    accounts: allAccounts.filter((acc) => acc.wallet.id === wallet.id),
  }));

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
            {accounts.map((account) => (
              <Button
                key={account.address}
                className="font-manrope bg-background/10 border-border h-14 w-full cursor-pointer rounded-[0.6rem] border-2 p-2 hover:bg-[#252525]/50"
                onClick={() => {
                  setSelectedAccount(account);
                  setIsWalletOpen(false);
                }}
              >
                <AccountInfo
                  address={account.address}
                  name={account.name ?? account.address}
                />
              </Button>
            ))}
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
