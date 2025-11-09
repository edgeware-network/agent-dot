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
  const persistedChainName =
    typeof window !== "undefined"
      ? localStorage.getItem("selectedChain")
      : null;
  const initialChain = persistedChainName
    ? (chainConfig.find((chain) => chain.name === persistedChainName) ??
      defaultChain)
    : defaultChain;
  const smoldotRef = useRef<Client | null>(null);
  const [activeChain, setActiveChain] = useState<ChainConfig>(initialChain);
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
      const TIMEOUT_MS = 30000; // 30 seconds timeout

      try {
        if (smoldotRef.current) {
          await smoldotRef.current.terminate();
          smoldotRef.current = null;
        }

        setConnectionStatus({
          type: WsEvent.CONNECTING,
          uri: "via lightclient",
        });

        // Wrap the connection in a timeout
        const connectionPromise = (async () => {
          // eslint-disable-next-line no-console
          console.log(
            `[LightClient] Starting Smoldot worker for ${chainConfig.name}...`,
          );
          smoldotRef.current = await startSmoldotWorker();
          // eslint-disable-next-line no-console
          console.log("[LightClient] Smoldot worker started");

          let chain;
          if (chainConfig.relayChainSpec) {
            // AssetHub chains need relay chain first
            // eslint-disable-next-line no-console
            console.log(
              `[LightClient] Adding relay chain: ${chainConfig.relayChainSpec.name}...`,
            );
            const relayChain = await smoldotRef.current.addChain({
              chainSpec: JSON.stringify(chainConfig.relayChainSpec),
            });
            // eslint-disable-next-line no-console
            console.log("[LightClient] Relay chain added");

            // eslint-disable-next-line no-console
            console.log(
              `[LightClient] Adding parachain: ${chainConfig.name}...`,
            );
            chain = await smoldotRef.current.addChain({
              chainSpec: JSON.stringify(chainConfig.chainSpec),
              potentialRelayChains: [relayChain],
            });
            // eslint-disable-next-line no-console
            console.log("[LightClient] Parachain added");
          } else {
            // Relay chains can be added directly
            // eslint-disable-next-line no-console
            console.log(
              `[LightClient] Adding relay chain: ${chainConfig.name}...`,
            );
            chain = await smoldotRef.current.addChain({
              chainSpec: JSON.stringify(chainConfig.chainSpec),
            });
            // eslint-disable-next-line no-console
            console.log("[LightClient] Relay chain added");
          }

          return chain;
        })();

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                `Connection timeout after ${String(TIMEOUT_MS / 1000)} seconds. The light client may be having trouble syncing. Try refreshing the page or selecting a different network.`,
              ),
            );
          }, TIMEOUT_MS);
        });

        const chain = await Promise.race([connectionPromise, timeoutPromise]);

        // eslint-disable-next-line no-console
        console.log(`[LightClient] Creating client for ${chainConfig.name}...`);
        const lightClient = createClient(getSmProvider(chain));
        setClient(lightClient);
        const typedApi = lightClient.getTypedApi(chainConfig.descriptors);
        setActiveApi(typedApi);
        setActiveChain(chainConfig);
        localStorage.setItem("selectedChain", chainConfig.name);
        setConnectionStatus({
          type: WsEvent.CONNECTED,
          uri: "via lightclient",
        });
        // eslint-disable-next-line no-console
        console.log(
          `[LightClient] Successfully connected to ${chainConfig.name}`,
        );
      } catch (error) {
        // Clean up on error
        if (smoldotRef.current) {
          try {
            await smoldotRef.current.terminate();
          } catch {
            // Ignore cleanup errors
          }
          smoldotRef.current = null;
        }

        setConnectionStatus({
          type: WsEvent.ERROR,
          event: error,
        });
        setActiveApi(null);
        setClient(null);

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        toast.error(
          `Failed to connect to ${chainConfig.name}: ${errorMessage}`,
          {
            duration: 10000,
            description: chainConfig.relayChainSpec
              ? "AssetHub chains can be slow to sync via light client. Try refreshing or switching networks."
              : "Try refreshing the page or switching to a different network.",
          },
        );
      }
    },
    [setClient, setActiveApi, setActiveChain, setConnectionStatus],
  );

  useEffect(() => {
    initializeClient(initialChain).catch((err: unknown) => {
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
  }, [initializeClient]);

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
