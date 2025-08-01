import { CHAINS, Parachains, RELAY_CHAINS } from "@/constants/chains";
import { tool } from "ai";
import z from "zod";

const SYMBOL_TO_RELAY_CHAIN = {
  DOT: "Polkadot",
  WND: "Westend",
  PAS: "Paseo",
} as const;

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

const xcmAgent = tool({
  name: "xcmAgent",
  description: `Teleport or xcm do transfers of DOT on ${SYMBOL_TO_RELAY_CHAIN.DOT} and its parachains/system chains ${Object.keys(CHAINS.DOT).join(", ")}, WND on ${SYMBOL_TO_RELAY_CHAIN.WND} and its parachains/system chains ${Object.keys(CHAINS.WND).join(", ")}, or PAS on ${SYMBOL_TO_RELAY_CHAIN.PAS} and its parachains/system chains ${Object.keys(CHAINS.PAS).join(", ")}. Always use active account wallet address. Always use the current active network/chain as source network/chain.`,
  inputSchema: z.object({
    src: z.string().describe("The source network/chain to teleport from."),
    dst: z.string().describe("The destination network/chain to teleport to."),
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
    // currently active system chain can have prefix polkadot, westend, or paseo so we need to remove it
    if (src.includes(" Asset Hub")) {
      const prefix = src.split(" Asset Hub")[0];
      if (prefix !== SYMBOL_TO_RELAY_CHAIN[symbol]) {
        return {
          message: `Teleport ${symbol} cannot be done from ${src} to ${dst}.`,
        };
      }
      src = src.split(" Asset Hub")[1].trim();
    }

    // validate that src associated with `symbol`
    const allowedRelay = SYMBOL_TO_RELAY_CHAIN[symbol];
    const allowedParachains = Object.keys(CHAINS[symbol]).map((k) =>
      k.toLowerCase().replace(/\s+/g, ""),
    );

    const srcNormalized = src.toLowerCase().replace(/\s+/g, "");

    const isSrcValid =
      src.toLowerCase() === allowedRelay.toLowerCase() ||
      allowedParachains.includes(srcNormalized);

    if (!isSrcValid) {
      return {
        message: `Invalid teleport: ${symbol} can only be teleported from ${src}`,
      };
    }

    const srcIndex = RELAY_CHAINS.findIndex(
      (chain) => chain.toLowerCase() === src.toLowerCase(),
    );

    const dstIndex = RELAY_CHAINS.findIndex(
      (chain) => chain.toLowerCase() === dst.toLowerCase(),
    );

    if (srcIndex !== -1 && dstIndex !== -1) {
      // both src and dst are relay chains
      return {
        message: `Teleport cannot be done between relay chains. ${src} and ${dst} are relay chains.`,
      };
    }

    if (srcIndex === -1 && dstIndex === -1) {
      // both src and dst are system chains
      // check if src and dst are on the same relay chain
      const parachains: Parachains = CHAINS[symbol];
      const srcKey = Object.keys(parachains).find(
        (key) => key.toLowerCase() === src.replace(/\s+/g, "").toLowerCase(),
      );
      const dstKey = Object.keys(parachains).find(
        (key) => key.toLowerCase() === dst.replace(/\s+/g, "").toLowerCase(),
      );

      if (srcKey && dstKey) {
        // src and dst are on the same relay chain
        const srcparachain = parachains[srcKey as keyof Parachains];
        const dstparachain = parachains[dstKey as keyof Parachains];

        return {
          message: `Teleporting ${amount} ${symbol} tokens from ${srcparachain} to ${dstparachain}.`,
          tx: {
            src: srcparachain,
            dst: dstparachain,
            amount,
            symbol,
            address,
          },
        };
      }
      // src and dst are not on the same relay chain
      return {
        message: `${src} and ${dst} are not on the same relay chain.`,
      };
    }

    if (srcIndex === -1 && dstIndex !== -1) {
      // src is a system chain and dst is a relay chain
      // check if src is on the same dst relay chain
      const parachains: Parachains = CHAINS[symbol];
      const srcKey = Object.keys(parachains).find(
        (key) => key.toLowerCase() === src.replace(/\s+/g, "").toLowerCase(),
      );

      if (srcKey) {
        // src is on the same dst relay chain
        const srcparachain = parachains[srcKey as keyof Parachains];
        const dstrelay = RELAY_CHAINS[dstIndex];

        return {
          message: `Teleporting ${amount} ${symbol} tokens from ${srcparachain} to ${dstrelay}.`,
          tx: {
            src: srcparachain,
            dst: dstrelay,
            amount,
            symbol,
            address,
          },
        };
      }
      // src is not on the same dst relay chain
      return {
        message: `${dst} doesn't have ${src} as a system chain.`,
      };
    }

    if (srcIndex !== -1 && dstIndex === -1) {
      // src is a relay chain and dst is a system chain
      // check if src is on the same dst relay chain
      const parachains: Parachains = CHAINS[symbol];
      const dstKey = Object.keys(parachains).find(
        (key) => key.toLowerCase() === dst.replace(/\s+/g, "").toLowerCase(),
      );

      if (dstKey) {
        // dst is on the same src relay chain
        const srcrelay = RELAY_CHAINS[srcIndex];
        const dstparachain = parachains[dstKey as keyof Parachains];

        return {
          message: `Teleporting ${amount} ${symbol} tokens from ${srcrelay} to ${dstparachain}.`,
          tx: {
            src: srcrelay,
            dst: dstparachain,
            amount,
            symbol,
            address,
          },
        };
      }
      // dst is not on the same src relay chain
      return {
        message: `${src} doesn't have ${dst} as a system chain.`,
      };
    }
  },
});

export { getAvailableRelayChains, getAvailableSystemChains, xcmAgent };
