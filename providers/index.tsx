"use client";

import { ExtensionProvider } from "@/providers/extension-provider";
import { LightClientApiProvider } from "@/providers/light-client-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ExtensionProvider>
      <LightClientApiProvider>{children}</LightClientApiProvider>
    </ExtensionProvider>
  );
}
