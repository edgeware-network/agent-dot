import { createClient, PolkadotClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider";

/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  getAccountBalance,
  getSessionValidators,
  StakingDescriptors,
} from "@/lib/polkadot-api";
import { ChainConfig, chainConfig } from "@/papi-config";
import type { WalletAccount } from "@/providers/wallet-provider";
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
  // Only hydrate if there's no current selection (to avoid overwriting recent switches)
  const hydrateSelectedFromStorage = () => {
    // Skip hydration if we already have a selected account in memory
    // This prevents overwriting recent account switches
    if (selectedAccountRef.current) return;

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
        setSelectedAccountRef.current(found);
      }
    } catch {
      // ignore
    }
  };

  hydrateSelectedFromStorage();
  // Resolve freshest active account; prefer in-memory ref (most current) over storage
  // Returns either a connected account or a lightweight { address, name } from storage
  const resolveActiveSelection = ():
    | { address?: string; name?: string }
    | undefined => {
    // FIRST: Check in-memory ref (most up-to-date, reflects recent switches)
    const mem = selectedAccountRef.current;
    if (mem) {
      return { address: mem.address, name: mem.name };
    }

    // SECOND: Fallback to localStorage if ref is not available
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
    const accountInput = toolCall.input as {
      address?: SS58String;
      name?: string;
    };

    const { address, name } = accountInput;

    // Must provide either name or address
    if (!address && !name) {
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output:
          "Please provide either an account name or address to switch to. For example: 'switch account to Alice' or 'switch to <address>'.",
      });
      return;
    }

    // Find matching account - prefer name match first, then address
    let foundAccount: WalletAccount | undefined;

    if (name) {
      // Try exact name match first (case-insensitive)
      foundAccount = connectedAccountsRef.current.find(
        (acc) => acc.name?.toLowerCase() === name.toLowerCase(),
      );
    }

    // If not found by name, try address match
    if (!foundAccount && address) {
      foundAccount = connectedAccountsRef.current.find(
        (acc) => acc.address === address,
      );
    }

    if (!foundAccount) {
      const availableAccounts = connectedAccountsRef.current.map(
        (acc) => acc.name ?? acc.address,
      );
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: `Account not found. Available accounts: ${availableAccounts.join(", ")}`,
      });
      return;
    }

    // Switch to the found account
    setSelectedAccountRef.current(foundAccount);

    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: `Switched to account: ${foundAccount.name ?? foundAccount.address}`,
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
