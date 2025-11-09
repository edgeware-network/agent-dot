"use client";

/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import { useClient } from "@reactive-dot/react";
import type { Subscription } from "rxjs";
import { useState, useRef, useEffect } from "react";

export function useBlockNumber() {
  const client = useClient();
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const subscription = useRef<Subscription | null>(null);

  useEffect(() => {
    if (client) {
      subscription.current = client.finalizedBlock$.subscribe((value) => {
        setBlockNumber(value.number);
      });
    }

    return () => {
      subscription.current?.unsubscribe();
      subscription.current = null;
      setBlockNumber(null);
    };
  }, [client]);

  return blockNumber;
}
