"use client";

import {
  type AvailableApis,
  type ChainConfig,
  chainConfig,
} from "@/papi-config";
import { createClient, PolkadotClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { type Client } from "polkadot-api/smoldot";
import { StatusChange, WsEvent } from "polkadot-api/ws-provider/web";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

interface LightClientApiContext {
  connectionStatus: StatusChange | undefined;
  activeChain: ChainConfig;
  setActiveChain: (chain: ChainConfig) => Promise<void>;
  client: PolkadotClient | null;
  api: AvailableApis | null;
}

const LightClientApiContext = createContext<LightClientApiContext | undefined>(
  undefined,
);

export function LightClientApiProvider({
  children,
  defaultChain = chainConfig[0],
}: {
  children: React.ReactNode;
  defaultChain?: ChainConfig;
}) {
  const smoldotRef = useRef<Client | null>(null);
  const [activeChain, setActiveChain] = useState<ChainConfig>(defaultChain);
  const [activeApi, setActiveApi] = useState<AvailableApis | null>(null);
  const [client, setClient] = useState<PolkadotClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    StatusChange | undefined
  >(undefined);

  async function startSmoldotWorker() {
    const { startFromWorker } = await import(
      "polkadot-api/smoldot/from-worker"
    );
    return startFromWorker(
      new Worker(new URL("polkadot-api/smoldot/worker", import.meta.url), {
        type: "module",
      }),
      { forbidWs: true },
    );
  }

  const initializeClient = useCallback(
    async (chainConfig: ChainConfig) => {
      try {
        setConnectionStatus({
          type: WsEvent.CONNECTING,
          uri: "via lightclient",
        });

        smoldotRef.current = await startSmoldotWorker();

        let chain;
        if (chainConfig.relayChainSpec) {
          const relayChain = await smoldotRef.current.addChain({
            chainSpec: JSON.stringify(chainConfig.relayChainSpec),
          });

          chain = await smoldotRef.current.addChain({
            chainSpec: JSON.stringify(chainConfig.chainSpec),
            potentialRelayChains: [relayChain],
          });
        } else {
          chain = await smoldotRef.current.addChain({
            chainSpec: JSON.stringify(chainConfig.chainSpec),
          });
        }

        const lightClient = createClient(getSmProvider(chain));
        setClient(lightClient);
        const typedApi = lightClient.getTypedApi(chainConfig.descriptors);
        setActiveApi(typedApi);
        setActiveChain(chainConfig);

        setConnectionStatus({
          type: WsEvent.CONNECTED,
          uri: "via lightclient",
        });
      } catch (error) {
        setConnectionStatus({
          type: WsEvent.ERROR,
          event: error,
        });
      }
    },
    [setClient, setActiveApi, setActiveChain, setConnectionStatus],
  );

  useEffect(() => {
    initializeClient(defaultChain).catch((err: unknown) => {
      const error = err as Error;
      setConnectionStatus({ type: WsEvent.ERROR, event: error });
      toast.error("Error connecting to chain: " + error.message);
    });

    return () => {
      (async () => {
        try {
          await smoldotRef.current?.terminate();
        } catch (e: unknown) {
          const error = e as Error;
          toast.error("Error during light client shutdown: " + error.message);
        } finally {
          smoldotRef.current = null;
          setClient(null);
        }
      })().catch((err: unknown) => {
        const error = err as Error;
        toast.error("Error during light client shutdown: " + error.message);
      });
    };
  }, [defaultChain, initializeClient]);

  return (
    <LightClientApiContext.Provider
      value={{
        connectionStatus,
        api: activeApi,
        client,
        activeChain,
        setActiveChain: initializeClient,
      }}
    >
      {children}
    </LightClientApiContext.Provider>
  );
}

export function useLightClientApi() {
  const context = useContext(LightClientApiContext);
  if (!context) {
    throw new Error(
      "useLightClientApi must be used within a LightClientApiProvider",
    );
  }
  return context;
}
