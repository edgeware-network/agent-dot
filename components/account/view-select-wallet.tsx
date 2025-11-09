"use client";

import { NavigationButton } from "@/components/account/navigation-button";
import { Button } from "@/components/ui/button";
import { ViewNavigationProps } from "@/components/ui/multi-view-dialog";
import { useWallet } from "@/providers/wallet-provider";
import { MdOutlineKeyboardDoubleArrowRight } from "react-icons/md";
import { RiWalletLine } from "react-icons/ri";
import { toast } from "sonner";

export default function ViewSelectWallet({ next }: ViewNavigationProps) {
  const {
    availableWallets,
    connectedWallets,
    connectWallet,
    disconnectWallet,
    allAccounts,
  } = useWallet();

  const handleWalletClick = async (walletId: string) => {
    const wallet = availableWallets.find((w) => w.id === walletId);
    if (!wallet) return;

    const isConnected = connectedWallets.some((w) => w.id === walletId);
    try {
      if (isConnected) {
        await disconnectWallet(wallet);
      } else {
        await connectWallet(wallet);
      }
    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto pr-2 sm:max-h-[70vh]">
        {availableWallets.map((wallet) => {
          const isConnected = connectedWallets.some((w) => w.id === wallet.id);
          const accountCount = allAccounts.filter(
            (acc) => acc.wallet.id === wallet.id,
          ).length;

          return (
            <Button
              className="bg-background/10 border-border flex h-16 w-full cursor-pointer items-center justify-between gap-2 rounded-[0.7rem] border-2 p-4 hover:bg-[#252525]/50"
              key={wallet.id}
              onClick={() => void handleWalletClick(wallet.id)}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center justify-center gap-2">
                  {isConnected ? (
                    <div className="h-1 w-1 rounded-full bg-green-500" />
                  ) : (
                    <div className="bg-info h-1 w-1 rounded-full" />
                  )}
                  {accountCount > 0 ? (
                    <span className="font-poppins w-2 text-xs font-semibold tracking-tight text-green-500">
                      {accountCount}
                    </span>
                  ) : (
                    <span className="text-info font-poppins w-2 text-xs font-semibold tracking-tight">
                      0
                    </span>
                  )}

                  <RiWalletLine className="h-6 w-6" />
                  <span className="text-foreground font-manrope text-base font-semibold tracking-tight">
                    {wallet.name}
                  </span>
                </div>
                <div className="text-info text-xs font-medium tracking-tight">
                  {isConnected ? (
                    <span className="font-manrope text-tertiary bg-tertiary/10 rounded-sm px-6 py-1 text-xs font-medium tracking-tight">
                      Disconnect
                    </span>
                  ) : (
                    <span className="font-manrope text-primary bg-primary/10 rounded-sm px-8 py-1 text-xs font-medium tracking-tight">
                      Connect
                    </span>
                  )}
                </div>
              </div>
            </Button>
          );
        })}
      </div>
      <NavigationButton
        Icon={MdOutlineKeyboardDoubleArrowRight}
        text="Manage accounts"
        onClick={next}
        disabled={!connectedWallets.length}
      />
    </div>
  );
}
