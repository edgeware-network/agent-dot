import { ChainBlockInfo } from "@/components/account";
import {
  geist,
  manrope,
  montserrat,
  outfit,
  poppins,
  unbounded,
  workSans,
} from "@/lib/font";
import { Providers } from "@/providers";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentDot",
  description:
    "AgentDot is an AI-Powered Interaction Layer for the Polkadot ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${manrope.variable} ${montserrat.variable} ${outfit.variable} ${poppins.variable} ${unbounded.variable} ${workSans.variable} antialiased`}
      >
        <Providers>
          {children}
          <ChainBlockInfo />
        </Providers>
        <Toaster
          position="bottom-right"
          richColors
          duration={3000}
          theme="dark"
        />
      </body>
    </html>
  );
}
