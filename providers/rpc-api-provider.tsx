"use client";

import { createClient, PolkadotClient } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider";
import { StatusChange, WsJsonRpcProvider } from "polkadot-api/ws-provider/web";

import {
  type AvailableApis,
  type ChainConfig,
  chainConfig,
} from "@/papi-config";
import {
  createContext,
  RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

export type ClientRef = RefObject<PolkadotClient | null>;
export type ActiveChainRef = RefObject<ChainConfig | null>;

interface RpcApiProviderType {
  connectionStatus: StatusChange | undefined;
  activeChain: ChainConfig | null;
  setActiveChain: (chain: ChainConfig) => void;
  client: PolkadotClient | null;
  wsProvider: WsJsonRpcProvider | null;
  api: AvailableApis | null;
}

const RpcApiContext = createContext<RpcApiProviderType | undefined>(undefined);

interface ExtendedProvider extends WsJsonRpcProvider {
  destroy?: () => void;
  ws?: { close: () => void };
}

export function RpcApiProvider({ children }: { children: React.ReactNode }) {
  const wsProviderRef = useRef<WsJsonRpcProvider | null>(null);
  const [activeChain, _setActiveChain] = useState<ChainConfig | null>(null);
  const [activeApi, setActiveApi] = useState<AvailableApis | null>(null);
  const clientRef = useRef<PolkadotClient | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<
    StatusChange | undefined
  >(undefined);

  useEffect(() => {
    const savedChainName = localStorage.getItem("selectedChain");
    const saved = savedChainName
      ? chainConfig.find(
          (c) => c.name.toLowerCase() === savedChainName.toLowerCase(),
        )
      : null;

    if (saved) {
      _setActiveChain(saved);
    } else {
      _setActiveChain(
        chainConfig.find((c) => c.name.toLowerCase() === "paseo") ??
          chainConfig[0],
      );
    }
  }, []);

  useEffect(() => {
    if (!activeChain) return;

    const wsEndpointSafe = handleWsEndpoint({
      defaultEndpoint: activeChain.endpoints[0],
    });

    if (!wsEndpointSafe) {
      toast.error("No valid WebSocket endpoint found");
      return;
    }

    try {
      const provider = getWsProvider([wsEndpointSafe], {
        onStatusChanged: setConnectionStatus,
      });

      wsProviderRef.current = provider;

      const client = createClient(withPolkadotSdkCompat(provider));
      clientRef.current = client;

      const api = client.getTypedApi(activeChain.descriptors);
      setActiveApi(api);

      void (async () => {
        try {
          const chainMeta =
            "constants" in api && "System" in api.constants
              ? await (
                  api.constants as Record<
                    string,
                    Record<string, () => Promise<unknown>>
                  >
                ).System.Version()
              : "";
          // eslint-disable-next-line no-console
          console.log(
            `[RpcApiProvider] Connected to ${activeChain.name}`,
            chainMeta,
          );
        } catch {
          // eslint-disable-next-line no-console
          console.log(`[RpcApiProvider] Connected to ${activeChain.name}`);
        }
      })();

      return () => {
        const extendedProvider = provider as ExtendedProvider;
        if (
          "destroy" in extendedProvider &&
          typeof extendedProvider.destroy === "function"
        ) {
          extendedProvider.destroy();
        } else if (
          extendedProvider.ws &&
          typeof extendedProvider.ws.close === "function"
        ) {
          extendedProvider.ws.close();
        }
      };
    } catch (error) {
      const err = error as Error;
      toast.error(`Failed to connect to ${activeChain.name}: ${err.message}`);
    }
  }, [activeChain]);

  const setActiveChain = (newChain: ChainConfig) => {
    try {
      const wsEndpoint = handleWsEndpoint({
        defaultEndpoint: newChain.endpoints[0],
      });
      if (!wsEndpoint) throw new Error("No valid WebSocket endpoint found");

      const endpoints = [wsEndpoint, ...newChain.endpoints.slice(1)];
      const _wsProvider = getWsProvider(endpoints, {
        onStatusChanged: setConnectionStatus,
      });

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
