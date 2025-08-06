import { SYMBOL_TO_RELAY_CHAIN, TOKEN_DECIMALS } from "@/constants/chains";
import { getNodeName, isAssetSupported } from "@/lib/paraspell";
import { convertAmountToPlancks, isValidSS58Address } from "@/lib/utils";
import {
  hasSupportForAsset,
  NODES_WITH_RELAY_CHAINS,
  NODES_WITH_RELAY_CHAINS_DOT_KSM,
} from "@paraspell/sdk";
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

const xcmAgent = tool({
  name: "xcmAgent",
  description:
    "Prepare and confirm an XCM transaction to teleport tokens on the Polkadot network.",
  inputSchema: z.object({
    src: z.string().describe("The source network/chain to teleport from."),
    dst: z.string().describe("The destination network/chain to teleport to."),
    amount: z.number().describe("The amount of tokens to teleport."),
    symbol: z
      .enum(["DOT", "WND", "PAS"])
      .describe("The symbol of the token to teleport."),
    sender: z.string().describe("A wallet address to teleport from."),
  }),
  outputSchema: z.object({
    tx: z
      .object({
        src: z.enum(NODES_WITH_RELAY_CHAINS_DOT_KSM),
        dst: z.enum(NODES_WITH_RELAY_CHAINS_DOT_KSM),
        amount: z.number(),
        symbol: z.enum(["DOT", "WND", "PAS"]),
        sender: z.string(),
      })
      .optional(),
    message: z.string().optional(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ src, dst, amount, symbol, sender }) => {
    // currently active system chain can have prefix polkadot, westend, or paseo so we need to remove it
    if (src.includes(" Asset Hub")) {
      const prefix = src.split(" Asset Hub")[0];
      if (prefix !== SYMBOL_TO_RELAY_CHAIN[symbol]) {
        return {
          message: `Teleport ${symbol} cannot be done from ${src} to ${dst}.`,
        };
      }
      src = "AssetHub";
    }

    try {
      const srcNodeName = getNodeName({ name: src, symbol });
      const dstNodeName = getNodeName({ name: dst, symbol });

      if (!isValidSS58Address(sender)) {
        return {
          message: `The provided address is not valid SS58 address. ${sender}`,
        };
      }

      if (!srcNodeName || !dstNodeName) {
        return {
          message: "Invalid source or destination network/chain.",
        };
      }

      if (!hasSupportForAsset(srcNodeName, symbol)) {
        return {
          message: `Teleport of ${symbol} is not supported on ${srcNodeName}.`,
        };
      }

      const isSupported = isAssetSupported({
        symbol,
        src: srcNodeName,
        dst: dstNodeName,
      });

      if (!isSupported) {
        return {
          message: `Teleport of ${symbol} is not supported from ${src} to ${dst}.`,
        };
      }
      return {
        tx: {
          src: srcNodeName,
          dst: dstNodeName,
          amount,
          sender,
          symbol,
        },
        message: `Teleport of ${amount.toFixed(3)} ${symbol} from ${src} to ${dst} has been prepared. Sign and submit the transaction to confirm the teleport.`,
      };
    } catch (error) {
      const err = error as Error;
      return {
        message: `Failed to prepare teleport: ${err.message}`,
      };
    }
  },
});

const xcmStablecoinFromAssetHub = tool({
  name: "xcmStablecoinFromAssetHub",
  description:
    "This tool is used to send or teleport stablecoins only from AssetHub to another polkadot-compatible network/chain (Hydration or Moonbeam). Always use ask for receipient wallet address to teleport to.",
  inputSchema: z.object({
    src: z.string().describe("The source network/chain to teleport from."),
    dst: z.string().describe("The destination network/chain to teleport to."),
    amount: z.number().describe("The amount of stablecoins to transfer."),
    symbol: z
      .enum(["USDT", "USDC"])
      .describe("The symbol of the stablecoin to transfer."),
    address: z.string().describe("A wallet address to teleport to."),
  }),
  outputSchema: z.object({
    tx: z
      .object({
        src: z.enum(NODES_WITH_RELAY_CHAINS),
        dst: z.enum(NODES_WITH_RELAY_CHAINS),
        amount: z.string(),
        id: z.number(),
      })
      .optional(),
    message: z.string(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ src, dst, amount, symbol, address }) => {
    if (
      (src === "AssetHub" || src === "Polkadot Asset Hub") &&
      dst === "Hydration"
    ) {
      return {
        message: `Teleporting ${String(amount)} ${symbol} tokens from AssetHub to Moonbeam, Hydration.`,
        tx: {
          src: "AssetHubPolkadot",
          dst: "Hydration",
          amount: convertAmountToPlancks(amount, TOKEN_DECIMALS[symbol]),
          id: 1984,
          address,
        },
      };
    }

    if (
      (src === "AssetHub" || src === "Polkadot Asset Hub") &&
      dst === "Moonbeam"
    ) {
      return {
        message: `Teleporting ${String(amount)} ${symbol} tokens from AssetHub to Moonbeam.`,
        tx: {
          src: "AssetHubPolkadot",
          dst: "Moonbeam",
          amount: convertAmountToPlancks(amount, TOKEN_DECIMALS[symbol]),
          id: 1984,
          address,
        },
      };
    }
    return {
      message: `Invalid transfer from ${src} to ${dst} for stablecoin ${symbol}. Use src: AssetHub and dst: Hydration or Moonbeam.`,
    };
  },
});

export {
  getAvailableRelayChains,
  getAvailableSystemChains,
  xcmAgent,
  xcmStablecoinFromAssetHub,
};
