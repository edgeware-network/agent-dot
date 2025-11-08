"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChainConfig, chainConfig } from "@/papi-config";
import { useWallet } from "@/providers/wallet-provider";
import Image from "next/image";
import { WsEvent } from "polkadot-api/ws-provider/web";
import { useEffect, useMemo, useState } from "react";
import { BiLoaderCircle } from "react-icons/bi";
import { TbAlertSquareRoundedFilled } from "react-icons/tb";
import { toast } from "sonner";

function ChainIcon({
  icon,
  fallbackIcon,
}: {
  icon: React.ReactNode;
  fallbackIcon: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return fallbackIcon;
  }

  return icon;
}

export default function ChainSelectButton() {
  const { activeChainId, switchChain } = useWallet();
  const activeChain =
    chainConfig.find((chain) => chain.key === activeChainId) ?? chainConfig[0];
  const [open, setOpen] = useState<boolean>(false);

  // Mock connection status (reactive-dot handles this internally)
  const connectionStatus = { type: WsEvent.CONNECTED };

  const TriggerButton = useMemo(
    function Trigger() {
      if (connectionStatus.type === WsEvent.ERROR) {
        return (
          <Button variant="ghost" size="icon">
            <TbAlertSquareRoundedFilled className="size-9 text-red-500" />
          </Button>
        );
      }

      if (connectionStatus.type === WsEvent.CONNECTING) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <BiLoaderCircle className="text-primary size-9 animate-spin" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-foreground font-outfit bg-[#141414] text-xs">
                Connecting to the network...
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return (
        <Button className="size-9 cursor-pointer" variant="ghost" size="icon">
          <ChainIcon
            icon={activeChain.icon}
            fallbackIcon={
              <Image
                src="/icons/polkadot.svg"
                alt="Polkadot"
                width={32}
                height={32}
              />
            }
          />
        </Button>
      );
    },
    [activeChain, connectionStatus],
  );

  function handleActiveChain(chain: ChainConfig) {
    try {
      switchChain(chain.key);
      toast.success(`Switched to ${chain.name}`);
    } catch (error) {
      const err = error as Error;
      toast.error(`Failed to switch chain: ${err.message}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="rounded-[1rem] sm:max-w-[425px]"
      >
        <DialogHeader className="items-start">
          <DialogTitle>Select a chain</DialogTitle>
          <DialogDescription className="text-muted-foreground font-manrope text-sm font-medium">
            Select a chain from the list below to use for app interactions
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[480px] flex-col gap-2 overflow-y-scroll">
          <div className="my-1 mr-2 flex flex-col gap-2">
            {chainConfig.map((chain) => (
              <Button
                key={chain.key}
                variant="ghost"
                size="lg"
                className="flex h-12 w-full items-center justify-between"
                onClick={() => {
                  handleActiveChain(chain);
                  setOpen(false);
                }}
              >
                <div className="flex w-full cursor-pointer items-center justify-start gap-2">
                  <div className="flex h-8 w-8 items-center justify-center">
                    <ChainIcon
                      icon={chain.icon}
                      fallbackIcon={
                        <Image
                          src="/icons/polkadot.svg"
                          alt="Polkadot"
                          width={32}
                          height={32}
                        />
                      }
                    />
                  </div>
                  <span className="text-foreground font-poppins truncate text-sm font-medium">
                    {chain.name}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
