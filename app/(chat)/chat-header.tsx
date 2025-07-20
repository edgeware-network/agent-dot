import ConnectButton from "@/app/(chat)/connect-button";
import { ChainSelectButton } from "@/components/account";
import Link from "next/link";

export default function ChatHeader() {
  return (
    <header className="bg-background sticky top-0 flex items-center justify-between gap-2 px-2 py-1.5 md:px-2">
      <Link href="/">
        <h2>AgentDot</h2>
      </Link>
      <div className="flex items-center gap-2">
        <ChainSelectButton />
        <ConnectButton />
      </div>
    </header>
  );
}
