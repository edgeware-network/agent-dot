"use client";

import { ExtensionProvider } from "@/providers/extension-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ExtensionProvider>{children}</ExtensionProvider>;
}
