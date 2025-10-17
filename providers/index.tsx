"use client";

import { ChainConfig, chainConfig } from "@/papi-config";
import { ExtensionProvider } from "@/providers/extension-provider";
import { LightClientApiProvider } from "@/providers/light-client-provider";
import { useEffect, useState } from "react";
import { RpcApiProvider } from "./rpc-api-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [defaultChain, setDefaultChain] = useState<ChainConfig>(chainConfig[0]);
  useEffect(() => {
    const storedChainName = localStorage.getItem("selectedChain");
    if (storedChainName) {
      const found = chainConfig.find((chain) => chain.name === storedChainName);
      if (found) {
        setDefaultChain(found);
      }
    }
  }, []);
  return (
    <ExtensionProvider>
      <RpcApiProvider>
        <LightClientApiProvider defaultChain={defaultChain}>
          {children}
        </LightClientApiProvider>
      </RpcApiProvider>
    </ExtensionProvider>
  );
}
