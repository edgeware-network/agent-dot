"use client";

import { chainConfig } from "@/papi-config";
import { ExtensionProvider } from "@/providers/extension-provider";
import { LightClientApiProvider } from "@/providers/light-client-provider";
import { RpcApiProvider } from "./rpc-api-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const storedChain =
    typeof window !== "undefined"
      ? chainConfig.find(
          (chain) => chain.name === localStorage.getItem("selectedChain"),
        )
      : chainConfig[0];
  const defaultChain = storedChain ?? chainConfig[0];
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
