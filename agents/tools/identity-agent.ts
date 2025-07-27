// client-side tools that are automatically executed on the client

import { tool } from "ai";
import z from "zod";

const getBalances = tool({
  name: "getBalances",
  description:
    "Read the on-chain balance of a given polkadot-compatible wallet address on a specific network/chain (switch network/chain first). If wallet address is not specified use active account. If network/chain is not specified use active network/chain.",
  inputSchema: z.object({
    address: z
      .string()
      .describe("A SS58-encoded wallet address to read the balance from."),
    network: z
      .string()
      .describe("The name of the network/chain to read the balance from."),
  }),
});

const getConnectedAccounts = tool({
  name: "getConnectedAccounts",
  description:
    "Get the list of connected polkadot-compatible wallet addresses.",
  inputSchema: z.object({}),
});

const getActiveAccount = tool({
  name: "getActiveAccount",
  description:
    "Get the currently active polkadot account for app interactions.",
  inputSchema: z.object({}),
});

const setActiveAccount = tool({
  name: "setActiveAccount",
  description:
    "Set the currently active polkadot account for app interactions.",
  inputSchema: z.object({
    address: z
      .string()
      .describe("A SS58-encoded wallet address to set as active account."),
    name: z
      .string()
      .describe("The name of the account to set as active account."),
  }),
});

export {
  getActiveAccount,
  getBalances,
  getConnectedAccounts,
  setActiveAccount,
};
