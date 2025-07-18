"use client";

import { NavigationButton } from "@/components/account/navigation-button";
import { DotWalletPlatform, dotWallets } from "@/components/account/wallets";
import { Identicon } from "@/components/identicon";
import { Button } from "@/components/ui/button";
import { ViewNavigationProps } from "@/components/ui/multi-view-dialog";
import { isMobile } from "@/lib/is-mobile";
import { trimAddress } from "@/lib/utils";
import { ExtenstionContext } from "@/providers/extension-provider";
import Image from "next/image";
import { use } from "react";
import { MdOutlineKeyboardDoubleArrowLeft } from "react-icons/md";

function AccountInfo({
  address,
  logo,
  name,
}: {
  address: string;
  logo: string | undefined;
  name: string;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <Identicon className="h-10 w-10" value={address} size={32} />
      <div className="flex w-full flex-col items-start justify-center gap-1">
        <div className="flex items-center gap-1">
          {logo && (
            <Image
              src={logo}
              alt={name}
              width={32}
              height={32}
              priority
              className="h-4 w-4"
            />
          )}
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
  const {
    selectedExtensions,
    setSelectedAccount,
    setIsWalletOpen,
    availableExtensions,
  } = use(ExtenstionContext);

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
      <div className="flex max-h-[45vh] grow flex-col gap-2 overflow-y-auto px-2 sm:max-h-[70vh]">
        {selectedExtensions.map((extension, index) => {
          const logo = systemWallets.find(
            (wallet) => wallet.id === extension.name,
          )?.logoUrls[0];
          return (
            <div key={index} className="flex flex-col gap-2">
              {extension.getAccounts().map((account, index) => {
                return (
                  <Button
                    key={index}
                    className="font-manrope bg-background/10 border-border h-14 w-full cursor-pointer rounded-[0.6rem] border-2 p-2 hover:bg-[#252525]/50"
                    onClick={() => {
                      setSelectedAccount(account, extension);
                      setIsWalletOpen(false);
                    }}
                  >
                    <AccountInfo
                      address={account.address}
                      logo={logo}
                      name={account.name ?? account.address}
                    />
                  </Button>
                );
              })}
            </div>
          );
        })}
      </div>
      <NavigationButton
        Icon={MdOutlineKeyboardDoubleArrowLeft}
        text="Manage wallets"
        onClick={previous}
        disabled={!selectedExtensions.length}
      />
    </div>
  );
}
