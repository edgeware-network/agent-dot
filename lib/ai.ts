/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  getAccountBalance,
  getSessionValidators,
  matchInjectedAccount,
} from "@/lib/polkadot-api";
import { chainConfig } from "@/papi-config";
import {
  ActiveChainRef,
  ApiRef,
  ClientRef,
  ConnectedAccountsRef,
  SelectedAccountRef,
  SelectedExtensionsRef,
  SetActiveChainRef,
  SetActiveRpcChainRef,
  SetSelectedAccountRef,
} from "@/types";
import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { SS58String } from "polkadot-api";

export async function onChatToolCall({
  apiRef,
  activeChainRef,
  setActiveChainRef,
  connectedAccountsRef,
  selectedAccountRef,
  setSelectedAccountRef,
  selectedExtensionsRef,
  clientRef,
  setActiveRpcChainRef,
  toolCall,
  addToolResult,
}: {
  apiRef: ApiRef;
  activeChainRef: ActiveChainRef;
  setActiveChainRef: SetActiveChainRef;
  connectedAccountsRef: ConnectedAccountsRef;
  selectedAccountRef: SelectedAccountRef;
  setSelectedAccountRef: SetSelectedAccountRef;
  selectedExtensionsRef: SelectedExtensionsRef;
  clientRef: ClientRef;
  setActiveRpcChainRef: SetActiveRpcChainRef;
  toolCall: {
    toolName: string;
    toolCallId: string;
    input: unknown;
  };
  addToolResult: UseChatHelpers<UIMessage>["addToolResult"];
}) {
  if (toolCall.toolName === "getBalances") {
    const account = toolCall.input as { address: SS58String };
    const balance = await getAccountBalance(
      account.address,
      apiRef,
      activeChainRef,
    );

    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: balance,
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
    const active = selectedAccountRef.current;

    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: JSON.stringify({
        name: active?.name,
        address: active?.address,
      }),
    });
  }

  if (toolCall.toolName === "setActiveAccount") {
    const account = toolCall.input as {
      address: SS58String | undefined;
      name: string;
    };

    const newAccount = matchInjectedAccount(account, selectedExtensionsRef);

    if (newAccount) {
      setSelectedAccountRef.current(newAccount.acc, newAccount.ext);
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: {
          success: true,
          message: `Set active account to ${account.name}`,
        },
      });
    } else {
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: {
          success: false,
          message: `Account ${account.name} not found`,
        },
      });
    }
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
        output: {
          success: false,
          message: `Network ${input.chain} is already active`,
        },
      });
    }
    if (network) {
      void setActiveChainRef.current(network);
      setActiveRpcChainRef.current(network);
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: {
          success: true,
          message: `Set active network to ${network.name}`,
        },
      });
    } else {
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: {
          success: false,
          message: `Network ${input.chain} not found`,
        },
      });
    }
  }

  if (toolCall.toolName === "getAvailableValidators") {
    const validators = await getSessionValidators({
      client: clientRef,
      activeChain: activeChainRef,
    });

    const val_addrs = validators.map((validator) => {
      return {
        address: validator.address,
        staked: validator.staked.toString(),
      };
    });

    addToolResult({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: JSON.stringify(val_addrs),
    });
  }
}
