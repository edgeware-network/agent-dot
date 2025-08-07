"use client";

import { createClient, PolkadotClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import {
  getWsProvider,
  StatusChange,
  WsJsonRpcProvider,
} from "polkadot-api/ws-provider/web";

import {
  chainConfig,
  type AvailableApis,
  type ChainConfig,
} from "@/papi-config";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface RpcApiProviderType {
  connectionStatus: StatusChange | undefined;
  activeChain: ChainConfig | null;
  setActiveChain: (chain: ChainConfig) => void;
  client: PolkadotClient | null;
  wsProvider: WsJsonRpcProvider | null;
  api: AvailableApis | null;
}

const RpcApiContext = createContext<RpcApiProviderType | undefined>(undefined);

export function RpcApiProvider({ children }: { children: React.ReactNode }) {
  const wsProviderRef = useRef<WsJsonRpcProvider | null>(null);
  const [activeChain, _setActiveChain] = useState<ChainConfig | null>(null);
  const [activeApi, setActiveApi] = useState<AvailableApis | null>(null);
  const clientRef = useRef<PolkadotClient | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<
    StatusChange | undefined
  >(undefined);

  useEffect(() => {
    setActiveChain(chainConfig[0]);
  }, []);

  const setActiveChain = (newChain: ChainConfig) => {
    try {
      const wsEndpoint = handleWsEndpoint({
        defaultEndpoint: newChain.endpoints[0],
      });
      if (!wsEndpoint) throw new Error("No valid WebSocket endpoint found");

      const endpoints = [wsEndpoint, ...newChain.endpoints.slice(1)];
      const _wsProvider = getWsProvider(endpoints, setConnectionStatus);

      wsProviderRef.current = _wsProvider;

      const client = createClient(withPolkadotSdkCompat(_wsProvider));
      const api = client.getTypedApi(newChain.descriptors);

      clientRef.current = client;
      setActiveApi(api);
      _setActiveChain(newChain);
    } catch (error) {
      const err = error as Error;
      toast.error(`Failed to connect to ${newChain.name}: ${err.message}`);
    }
  };

  return (
    <RpcApiContext.Provider
      value={{
        connectionStatus,
        api: activeApi,
        wsProvider: wsProviderRef.current,
        client: clientRef.current,
        activeChain,
        setActiveChain,
      }}
    >
      {children}
    </RpcApiContext.Provider>
  );
}

export function useRpcApi() {
  const context = useContext(RpcApiContext);
  if (!context) {
    throw new Error("useRpcApi must be used within a RpcApiProvider");
  }
  return context;
}

/**
 * Get or set the WebSocket endpoint from URL search params
 * Default endpoint will be used if none is specified
 */
export function handleWsEndpoint({
  defaultEndpoint,
}: {
  defaultEndpoint?: string;
} = {}) {
  if (typeof window === "undefined") return defaultEndpoint;

  const params = new URLSearchParams(window.location.search);
  const wsEndpoint = params.get("rpc");

  if (!wsEndpoint) return defaultEndpoint;

  // Validate endpoint is a valid WSS URL
  try {
    const url = new URL(wsEndpoint);
    if (url.protocol !== "wss:") return defaultEndpoint;
    return wsEndpoint;
  } catch {
    return defaultEndpoint;
  }
}
