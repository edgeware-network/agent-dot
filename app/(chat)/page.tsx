"use client";

import dynamic from "next/dynamic";

const Chat = dynamic(() => import("@/app/(chat)/chat"), {
  ssr: false,
});

export default function Page() {
  return (
    <>
      <Chat />
    </>
  );
}
