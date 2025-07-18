"use client";

import { NavigationButton } from "@/components/account/navigation-button";
import { DotWalletPlatform, dotWallets } from "@/components/account/wallets";
import { Button } from "@/components/ui/button";
import { ViewNavigationProps } from "@/components/ui/multi-view-dialog";
import { isMobile } from "@/lib/is-mobile";
import { ExtenstionContext } from "@/providers/extension-provider";
import { use } from "react";
import { MdOutlineKeyboardDoubleArrowRight } from "react-icons/md";

import Image from "next/image";
import { toast } from "sonner";

export default function ViewSelectWallet({ next }: ViewNavigationProps) {
  const { availableExtensions, selectedExtensions, onToggleExtension } =
    use(ExtenstionContext);

  const systemWallets = dotWallets
    .filter((wallet) =>
      isMobile()
        ? wallet.platforms.includes(DotWalletPlatform.Android) ||
          wallet.platforms.includes(DotWalletPlatform.iOS)
        : wallet.platforms.includes(DotWalletPlatform.Browser),
    )
    .sort((a, b) =>
      availableExtensions.includes(a.id)
        ? -1
        : availableExtensions.includes(b.id)
          ? 1
          : 0,
    );
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto pr-2 sm:max-h-[70vh]">
        {systemWallets.map((wallet, index) => {
          const connectedExtension = selectedExtensions.find(
            (extension) => extension.name === wallet.id,
          );
          const isConnected = !!connectedExtension;
          const accounts =
            connectedExtension
              ?.getAccounts()
              .filter((acc) => acc.type === "sr25519").length ?? 0;
          return (
            <Button
              className="bg-background/10 border-border flex h-16 w-full cursor-pointer items-center justify-between gap-2 rounded-[0.7rem] border-2 p-4 hover:bg-[#252525]/50"
              key={index}
              onClick={() => {
                if (availableExtensions.includes(wallet.id)) {
                  onToggleExtension(wallet.id).catch((e: unknown) => {
                    const error = e as Error;
                    toast.error(error.message);
                  });
                } else {
                  window.open(wallet.urls.website, "_blank");
                }
              }}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center justify-center gap-2">
                  {isConnected ? (
                    <div className="h-1 w-1 rounded-full bg-green-500" />
                  ) : (
                    <div className="bg-info h-1 w-1 rounded-full" />
                  )}
                  {accounts > 0 ? (
                    <span className="font-poppins w-2 text-xs font-semibold tracking-tight text-green-500">
                      {accounts}
                    </span>
                  ) : (
                    <span className="text-info font-poppins w-2 text-xs font-semibold tracking-tight">
                      0
                    </span>
                  )}

                  <Image
                    src={wallet.logoUrls[0]}
                    alt={wallet.name}
                    width={24}
                    height={24}
                    priority
                    sizes="24px"
                    className="h-6 w-6"
                  />
                  <span className="text-foreground font-manrope text-base font-semibold tracking-tight">
                    {wallet.name}
                  </span>
                </div>
                <div className="text-info text-xs font-medium tracking-tight">
                  {!availableExtensions.includes(wallet.id) ? (
                    <span className="font-manrope text-secondary bg-secondary/10 rounded-sm px-10 py-1 text-xs font-medium tracking-tight">
                      Install
                    </span>
                  ) : isConnected ? (
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
        disabled={!selectedExtensions.length}
      />
    </div>
  );
}
