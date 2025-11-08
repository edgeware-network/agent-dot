import { createClient, PolkadotClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider";

/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  getAccountBalance,
  getSessionValidators,
  StakingDescriptors,
} from "@/lib/polkadot-api";
import { ChainConfig, chainConfig } from "@/papi-config";
import {
  ActiveChainRef,
  ApiRef,
  ClientRef,
  ConnectedAccountsRef,
  SelectedAccountRef,
  SetActiveRpcChainRef,
  SetSelectedAccountRef,
} from "@/types";
import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { SS58String } from "polkadot-api";
import { RefObject } from "react";

export async function onChatToolCall({
  apiRef,
  activeChainRef,
  setActiveChainRef,
  connectedAccountsRef,
  selectedAccountRef,
  setSelectedAccountRef,
  clientRef,
  setActiveRpcChainRef,
  toolCall,
  addToolResult,
}: {
  apiRef: ApiRef;
  activeChainRef: ActiveChainRef;
  setActiveChainRef: RefObject<(chain: ChainConfig) => void>;
  connectedAccountsRef: ConnectedAccountsRef;
  selectedAccountRef: SelectedAccountRef;
  setSelectedAccountRef: SetSelectedAccountRef;
  clientRef: ClientRef;
  setActiveRpcChainRef: SetActiveRpcChainRef;
  toolCall: {
    toolName: string;
    toolCallId: string;
    input: unknown;
  };
  addToolResult: UseChatHelpers<UIMessage>["addToolResult"];
}) {
  // Before handling any tool, try to hydrate the selected account from storage
  const hydrateSelectedFromStorage = () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("agent-dot:selected-account");
      if (!raw) return;
      const { address, name } = JSON.parse(raw) as {
        address?: string;
        name?: string;
      };
      // try to find a connected account that matches
      let found = address
        ? connectedAccountsRef.current.find((a) => a.address === address)
        : undefined;
      if (!found && name) {
        found = connectedAccountsRef.current.find((a) => a.name === name);
      }
      if (found) {
        const current = selectedAccountRef.current;
        if (current?.address !== found.address) {
          setSelectedAccountRef.current(found);
        }
      }
    } catch {
      // ignore
    }
  };

  hydrateSelectedFromStorage();
  // Resolve freshest active account; prefer latest persisted selection (storage)
  // Returns either a connected account or a lightweight { address, name } from storage
  const resolveActiveSelection = ():
    | { address?: string; name?: string }
    | undefined => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("agent-dot:selected-account");
        if (raw) {
          const { address, name } = JSON.parse(raw) as {
            address?: string;
            name?: string;
          };
          // Prefer connected match by address
          if (address) {
            const byAddress = connectedAccountsRef.current.find(
              (a) => a.address === address,
            );
            if (byAddress)
              return { address: byAddress.address, name: byAddress.name };
          }
          // Fallback match by name if available
          if (name) {
            const byName = connectedAccountsRef.current.find(
              (a) => a.name === name,
            );
            if (byName) return { address: byName.address, name: byName.name };
          }
          // If not connected yet, still return stored selection for identity answers
          if (address || name) return { address, name };
        }
      } catch {
        // ignore
      }
    }
    // fallback to in-memory selection
    const mem = selectedAccountRef.current;
    if (mem) return { address: mem.address, name: mem.name };
    return undefined;
  };
  if (toolCall.toolName === "getBalances") {
    const input = toolCall.input as { address?: SS58String; network?: string };

    // Prefer the currently selected account from UI if present.
    // This ensures manual account switches are respected even if a stale address was passed.
    const activeAddress = resolveActiveSelection()?.address;
    const address = activeAddress ?? input.address;
    if (!address) {
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: "No account selected. Please connect a wallet first.",
      });
      return;
    }

    const balance = await getAccountBalance(address, apiRef, activeChainRef);

    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: balance,
    });
  }

  if (toolCall.toolName === "getActiveNameAndBalance") {
    const active = resolveActiveSelection();

    if (!active?.address) {
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: "No account selected. Please connect a wallet first.",
      });
      return;
    }

    const balance = await getAccountBalance(
      active.address,
      apiRef,
      activeChainRef,
    );

    const text = `Name: ${active.name ?? "Unknown"}\nAddress: ${active.address}\nBalance: ${balance}`;
    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: text,
    });
  }

  if (toolCall.toolName === "getConnectedAccounts") {
    const accounts = connectedAccountsRef.current.map((account) => ({
      name: account.name,
      address: account.address,
    }));

    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: JSON.stringify(accounts),
    });
  }

  if (toolCall.toolName === "getActiveAccount") {
    const active = resolveActiveSelection();
    const text = active?.address
      ? `Name: ${active.name ?? "Unknown"}\nAddress: ${active.address}`
      : "No account selected. Please connect a wallet first.";

    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: text,
    });
  }

  if (toolCall.toolName === "setActiveAccount") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _account = toolCall.input as {
      address: SS58String | undefined;
      name: string;
    };

    // Safety: require explicit user instruction to switch; do not switch on corrections like "nope"
    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output:
        "Switching accounts requires explicit instruction. Ask the user to pick from the side tab or say: 'switch account to <address>'.",
    });
  }

  if (toolCall.toolName === "getAvailableNetworks") {
    const networks = chainConfig.map((chain) => chain.name);

    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: JSON.stringify(networks),
    });
  }

  if (toolCall.toolName === "getActiveNetwork") {
    const network = activeChainRef.current.name;

    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: network,
    });
  }

  if (toolCall.toolName === "setActiveNetwork") {
    const input = toolCall.input as {
      chain: string;
    };
    const network = chainConfig.find(
      (chain) => chain.name.toLowerCase() === input.chain.toLowerCase(),
    );
    if (input.chain === activeChainRef.current.name) {
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: `Network ${input.chain} is already active`,
      });
    }
    if (network) {
      setActiveChainRef.current(network);
      setActiveRpcChainRef.current(network);
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: `Set active network to ${network.name}`,
      });
    } else {
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: `Network ${input.chain} not found`,
      });
    }
  }

  if (toolCall.toolName === "getAvailableValidators") {
    try {
      if (!clientRef.current) {
        addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output:
            "Client not connected. Please ensure you are connected to a network.",
        });
        return;
      }

      // Check if the current network is a relay chain
      const relayChainKeys = ["polkadot", "westend", "paseo", "kusama"];
      const currentChainKey = activeChainRef.current.key.toLowerCase();

      if (!relayChainKeys.includes(currentChainKey)) {
        addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: `Fetching validators is only available on relay chains (Polkadot, Kusama, Westend, or Paseo). Your current network is ${activeChainRef.current.name}, which is not a relay chain. Please switch to a relay chain to fetch validators.`,
        });
        return;
      }

      const assetHub = chainConfig.find(
        (chain) => chain.key === `${activeChainRef.current.key}_asset_hub`,
      );

      let assetHubClient: PolkadotClient | null = null;
      if (assetHub) {
        try {
          const provider = getWsProvider(assetHub.endpoints);
          assetHubClient = createClient(provider);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Failed to create assetHub client:", error);
          // Continue without assetHub client
        }
      }

      const validators = await getSessionValidators({
        client: clientRef,
        assetHubClient: assetHubClient,
        activeChain: activeChainRef,
      });

      if (assetHubClient) {
        assetHubClient.destroy();
      }

      if (validators.length === 0) {
        addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output:
            "No validators found for the current network. Please ensure you are connected to a relay chain (Polkadot, Kusama, Westend, or Paseo).",
        });
        return;
      }

      const val_addrs = validators.map((validator) => {
        return {
          address: validator.address,
          staked: validator.staked,
        };
      });

      let output = `Found ${String(val_addrs.length)} validators for ${activeChainRef.current.name} (sorted by total staked amount, descending, showing top ${String(val_addrs.length)}):\n\n| Address | Staked |\n|---|---|\n`;
      val_addrs.forEach((v) => {
        output += `| ${v.address} | ${v.staked} |\n`;
      });

      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching validators:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: `Failed to fetch validators: ${errorMessage}. Please ensure you are connected to a relay chain (Polkadot, Kusama, Westend, or Paseo).`,
      });
    }
  }

  if (toolCall.toolName === "getBondedAmountAgent") {
    const input = toolCall.input as {
      controllerAccount: SS58String;
      tokenSymbol?: string;
      network?: string;
    };

    try {
      if (!clientRef.current) {
        addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output:
            "Client not connected. Please ensure you are connected to a network.",
        });
        return;
      }

      // Validate that user is on AssetHub for staking operations
      const tokenSymbol =
        input.tokenSymbol ??
        activeChainRef.current.chainSpec.properties.tokenSymbol;
      const normalizedNetwork = (input.network ?? activeChainRef.current.name)
        .trim()
        .toLowerCase();

      // Import SYMBOL_TO_RELAY_CHAIN to get relay chain name
      const { SYMBOL_TO_RELAY_CHAIN } = await import("@/constants/chains");
      const relayChain =
        SYMBOL_TO_RELAY_CHAIN[
          tokenSymbol as keyof typeof SYMBOL_TO_RELAY_CHAIN
        ];
      const assetHubName = `${relayChain} AssetHub`.toLowerCase();

      if (
        normalizedNetwork !== assetHubName &&
        normalizedNetwork !== "polkadot assethub" &&
        normalizedNetwork !== "westend assethub" &&
        normalizedNetwork !== "paseo assethub"
      ) {
        addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: `This operation is not possible on ${activeChainRef.current.name}. Staking operations for ${tokenSymbol} are only available on ${relayChain} AssetHub. Please switch to ${relayChain} AssetHub to perform this operation.`,
        });
        return;
      }

      const descriptors = activeChainRef.current.descriptors;
      const api = clientRef.current.getTypedApi(
        descriptors as StakingDescriptors,
      );

      const ledger = await api.query.Staking.Ledger.getValue(
        input.controllerAccount,
      );

      if (!ledger) {
        addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: `No bonded stake found for controller account ${input.controllerAccount} on ${activeChainRef.current.name}. This account may not be a controller for any staking account, or you may need to check on ${relayChain} AssetHub if staking has migrated there.`,
        });
        return;
      }

      const tokenDecimals =
        activeChainRef.current.chainSpec.properties.tokenDecimals;
      const totalBonded = Number(ledger.total) / Math.pow(10, tokenDecimals);
      const activeBonded = Number(ledger.active) / Math.pow(10, tokenDecimals);
      const stashAccount = ledger.stash;

      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: `Stash: ${stashAccount}\nTotal Bonded: ${totalBonded.toFixed(2)} ${tokenSymbol}\nActive Bonded: ${activeBonded.toFixed(2)} ${tokenSymbol}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: `Failed to query bonded amount: ${errorMessage}`,
      });
    }
  }
}
