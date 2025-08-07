"use client";

import { chainConfig } from "@/papi-config";
import { ExtensionProvider } from "@/providers/extension-provider";
import { LightClientApiProvider } from "@/providers/light-client-provider";
import { RpcApiProvider } from "./rpc-api-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ExtensionProvider>
      <RpcApiProvider>
        <LightClientApiProvider defaultChain={chainConfig[0]}>
          {children}
        </LightClientApiProvider>
      </RpcApiProvider>
    </ExtensionProvider>
  );
}
