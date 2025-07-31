import { CHAINS, Parachains, RELAY_CHAINS } from "@/constants/chains";
import { tool } from "ai";
import z from "zod";

const getAvailableSystemChains = tool({
  name: "getAvailableSystemChains",
  description:
    "Get the list of available system chains/networks for cross-chain transfers.",
  inputSchema: z.object({}),
});

const getAvailableRelayChains = tool({
  name: "getAvailableRelayChains",
  description:
    "Get the list of available relay chains/networks for cross-chain transfers.",
  inputSchema: z.object({}),
});

const teleportDotToSystemChain = tool({
  name: "teleportDotToSystemChain",
  description:
    "Teleport DOT, WND, or PAS tokens from relay chain to system chain. Always use active account wallet address. Always use the current active network/chain as source network/chain.",
  inputSchema: z.object({
    src: z
      .string()
      .describe("The source network/chain is a relay chain to teleport from."),
    dst: z
      .string()
      .describe(
        "The destination network/chain is a system chain of relay chain to teleport to.",
      ),
    amount: z.string().describe("The amount of tokens to teleport."),
    symbol: z
      .enum(["DOT", "WND", "PAS"])
      .describe("The symbol of the token to teleport."),
    address: z
      .string()
      .describe("A SS58-encoded wallet address to teleport from."),
  }),
  outputSchema: z.object({
    tx: z
      .object({
        src: z.string(),
        dst: z.string(),
        amount: z.string(),
      })
      .optional(),
    message: z.string(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ src, dst, amount, symbol, address }) => {
    const index = RELAY_CHAINS.findIndex(
      (chain) => chain.toLowerCase() === src.toLowerCase(),
    );

    if (index === -1) {
      return {
        message: `Source network/chain ${src} is not a relay chain.`,
      };
    }

    const relay = RELAY_CHAINS[index];
    const parachains: Parachains = CHAINS[symbol];

    const key = Object.keys(parachains).find(
      (key) => key.toLowerCase() === dst.replace(/\s+/g, "").toLowerCase(),
    );

    if (!key) {
      return {
        message: `Destination network/chain ${dst} is not a system chain of relay chain ${relay}.`,
      };
    }

    const parachain: string = parachains[key as keyof Parachains];

    if (symbol === "DOT" && relay !== "Polkadot") {
      return {
        message: `Teleporting DOT tokens from ${src} to ${dst} is not possible. Switch to polkadot relay chain first.`,
      };
    }

    if (symbol === "WND" && relay !== "Westend") {
      return {
        message: `Teleporting WND tokens from ${src} to ${dst} is not possible. Switch to westend relay chain first.`,
      };
    }

    if (symbol === "PAS" && relay !== "Paseo") {
      return {
        message: `Teleporting PAS tokens from ${src} to ${dst} is not possible. Switch to paseo relay chain first.`,
      };
    }

    return {
      message: `Teleporting ${amount} ${symbol} tokens from ${relay} to ${parachain}.`,
      tx: {
        src: relay,
        dst: parachain,
        amount,
        symbol,
        address,
      },
    };
  },
});

export {
  getAvailableRelayChains,
  getAvailableSystemChains,
  teleportDotToSystemChain,
};
