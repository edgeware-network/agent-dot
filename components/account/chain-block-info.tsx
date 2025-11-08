"use client";

import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBlockNumber } from "@/hooks/use-block-number";
import { chainConfig } from "@/papi-config";
import { useWallet } from "@/providers/wallet-provider";
import { WsEvent } from "polkadot-api/ws-provider/web";
import { useEffect, useMemo, useState } from "react";
import { BiLoaderCircle } from "react-icons/bi";

export default function ChainBlockInfo() {
  const { activeChainId } = useWallet();
  const activeChain =
    chainConfig.find((chain) => chain.key === activeChainId) ?? chainConfig[0];

  // Mock connection status (reactive-dot handles this internally)
  const connectionStatus = { type: WsEvent.CONNECTED };
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const blockNumber = useBlockNumber();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const status: "connected" | "error" | "connecting" =
    connectionStatus.type === WsEvent.CONNECTED && blockNumber
      ? "connected"
      : connectionStatus.type === WsEvent.ERROR ||
          connectionStatus.type === WsEvent.CLOSE
        ? "error"
        : "connecting";

  const Trigger = useMemo(() => {
    return (
      <div className="font-outfit text-foreground h-4 cursor-pointer rounded-md px-2 text-sm font-light tabular-nums">
        {status === "connected" ? (
          <>
            <span className="mr-1 block h-2 w-2 animate-pulse rounded-full bg-green-600" />
          </>
        ) : status === "error" ? (
          <>
            <span className="block h-2 w-2 rounded-full bg-red-500" />
          </>
        ) : (
          <div className="flex h-4 items-end gap-1">
            <BiLoaderCircle className="h-4 w-4 animate-spin text-yellow-500" />
            <span className="font-work-sans text-xs font-light">
              Connecting to {activeChain.name} via lightclient
            </span>
          </div>
        )}
        {status === "connected" && blockNumber && (
          <span className="text-xs">{`#${blockNumber.toString()}`}</span>
        )}
      </div>
    );
  }, [status, activeChain, blockNumber]);

  if (!isMounted) {
    return (
      <div className="font-outfit text-foreground h-4 px-2 text-sm font-light tabular-nums">
        {" "}
        Loading...
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100} open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild className="ml-auto flex place-items-center">
          {Trigger}
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  );
}
