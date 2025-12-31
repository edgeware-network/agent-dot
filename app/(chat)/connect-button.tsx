"use client";

import { ViewSelectAccount, ViewSelectWallet } from "@/components/account";
import { Identicon } from "@/components/identicon";
import { Button } from "@/components/ui/button";
import { DialogView, MultiViewDialog } from "@/components/ui/multi-view-dialog";
import { useAccountBalance } from "@/hooks/use-account-balance";
import { useRefObject } from "@/hooks/use-ref-object";
import { cn, convertAddressToChainFormat, trimAddress } from "@/lib/utils";
import { useWallet } from "@/providers/wallet-provider";

function Wallet({
  address,
  name,
  balance,
}: {
  address: string;
  name: string;
  balance: string | null;
}) {
  return (
    <div className="font-outfit flex min-w-0 flex-1 items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5">
        <span className="text-foreground max-w-full truncate text-sm font-bold">
          {name}
        </span>
        <span className="font-outfit text-muted-foreground max-w-full truncate text-[12px] font-medium">
          {trimAddress(address, 6)}
        </span>
        {balance && (
          <span className="font-outfit text-foreground max-w-full truncate text-[12px] font-semibold">
            {balance}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ConnectButton() {
  const { selectedAccount, connectedWallets } = useWallet();
  const { activeChainRef } = useRefObject();
  const { balance } = useAccountBalance();

  const hasConnectedWallets = connectedWallets.length > 0;

  // Convert address to active chain format for display
  const displayAddress = selectedAccount?.address
    ? convertAddressToChainFormat(
        selectedAccount.address,
        activeChainRef.current.name,
      )
    : undefined;

  const views: DialogView[] = [
    {
      title: "Connect Wallet",
      description:
        "Connect your wallet. Now supports WalletConnect, Ledger hardware wallets, and Mimir multisig!",
      content: ({ next, previous }) => (
        <ViewSelectWallet next={next} previous={previous} />
      ),
    },
    {
      title: "Select Account",
      description: "Select an account to use for app interactions",
      content: ({ previous }) => <ViewSelectAccount previous={previous} />,
    },
  ];
  return (
    <Button
      size="lg"
      variant="outline"
      className="font-outfit flex h-auto max-w-[200px] min-w-32 cursor-pointer items-center justify-center rounded-[0.625rem] px-2 py-1.5 text-base font-medium tracking-tight font-stretch-condensed transition-colors duration-100 active:scale-[0.99]"
    >
      <MultiViewDialog
        initialView={hasConnectedWallets ? 1 : 0}
        trigger={
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2",
              !selectedAccount?.address && "justify-center",
            )}
          >
            {selectedAccount?.name && displayAddress && (
              <Wallet
                address={displayAddress}
                name={selectedAccount.name}
                balance={balance}
              />
            )}
            {!selectedAccount?.address && (
              <span className="truncate sm:block">Connect</span>
            )}
          </div>
        }
        views={views}
      />
      {displayAddress && (
        <Identicon
          value={displayAddress}
          size={30}
          className="shrink-0 [&>svg>circle:first-child]:fill-none"
        />
      )}
    </Button>
  );
}
