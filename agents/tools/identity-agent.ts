// client-side tools that are automatically executed on the client
/* eslint-disable @typescript-eslint/ban-ts-comment -- TypeScript compiler shows errors but ESLint parser doesn't, so we use @ts-ignore */

import { tool } from "ai";
import z from "zod";

const getBalances = tool({
  name: "getBalances",
  description:
    "Read the on-chain balance of a given polkadot-compatible wallet address on a specific network/chain (switch network/chain first). If the user asks any balance-related question (e.g., 'what's my balance', 'how much do I have'), call this tool with no parameters to use the currently active account and network. If address is not specified use active account. If network/chain is not specified use active network/chain.",
  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    address: z
      .string()
      .optional()
      .describe(
        "A SS58-encoded wallet address to read the balance from. If not provided, uses the active account.",
      ),
    network: z
      .string()
      .optional()
      .describe(
        "The name of the network/chain to read the balance from. If not provided, uses the active network.",
      ),
  }),
});

const getActiveNameAndBalance = tool({
  name: "getActiveNameAndBalance",
  description:
    "Return the active account's name and on-chain balance on the active network/chain. For free-form queries like 'what is my account', 'what is my name', 'who am I', prefer calling this tool to provide an authoritative answer from the current selection.",

  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({}),
});

const getConnectedAccounts = tool({
  name: "getConnectedAccounts",
  description:
    "Get the list of connected polkadot-compatible wallet addresses.",

  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({}),
});

const getActiveAccount = tool({
  name: "getActiveAccount",
  description:
    "Get the currently active polkadot account for app interactions. Use for identity questions (e.g., 'what's my account/name/address'). Always fetch this before answering identity questions to avoid stale information.",

  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({}),
});

const setActiveAccount = tool({
  name: "setActiveAccount",
  description:
    "Set the currently active polkadot account for app interactions. You can provide either the account name or address. If the user says 'switch account to <name>' or 'switch to <name>', use the name. If they provide an address, use that. Always prefer name matching when available as it's more user-friendly. You MUST provide at least one of name or address.",
  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z
    .object({
      address: z
        .string()
        .optional()
        .describe(
          "A SS58-encoded wallet address to set as active account. Provide this if the user gives an address, otherwise use name.",
        ),
      name: z
        .string()
        .optional()
        .describe(
          "The name of the account to set as active account. Provide this if the user gives an account name (e.g., 'switch to Alice' or 'switch account to Bob').",
        ),
    })
    .refine((data) => data.address != null || data.name != null, {
      message: "Either 'name' or 'address' must be provided",
    }),
});

const getAvailableNetworks = tool({
  name: "getAvailableNetworks",
  description: "Get the list of available polkadot-compatible networks/chains.",

  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({}),
});

const getActiveNetwork = tool({
  name: "getActiveNetwork",
  description:
    "Get the currently active polkadot network/chain for app interactions.",

  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({}),
});

const setActiveNetwork = tool({
  name: "setActiveNetwork",
  description:
    "Set the currently active polkadot network/chain for app interactions.",

  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    chain: z
      .string()
      .describe(
        "The name of the network/chain to set as active network/chain.",
      ),
  }),
});

export {
  getActiveAccount,
  getActiveNameAndBalance,
  getActiveNetwork,
  getAvailableNetworks,
  getBalances,
  getConnectedAccounts,
  setActiveAccount,
  setActiveNetwork,
};
