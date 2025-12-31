/* eslint-disable @typescript-eslint/ban-ts-comment -- TypeScript compiler shows errors but ESLint parser doesn't, so we use @ts-ignore */
import { getNodeName, isAssetSupported } from "@/lib/paraspell";
import { isValidEthereumAddress, isValidSS58Address } from "@/lib/utils";
import {
  convertSs58,
  hasSupportForAsset,
  SUBSTRATE_CHAINS,
} from "@paraspell/sdk";
import { tool } from "ai";
import z from "zod";
import { CHAINS } from "@/constants/chains";

const getAvailableSystemChains = tool({
  name: "getAvailableSystemChains",
  description:
    "Get the list of available system chains/networks for cross-chain transfers.",
  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({}),
});

const getAvailableRelayChains = tool({
  name: "getAvailableRelayChains",
  description:
    "Get the list of available relay chains/networks for cross-chain transfers.",
  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({}),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _xcmAgentInputSchema = z.object({
  src: z.string().describe("The source network/chain to teleport from."),
  dst: z.string().describe("The destination network/chain to teleport to."),
  amount: z.number().describe("The amount of tokens to teleport."),
  symbol: z
    .enum(["DOT", "WND", "PAS"])
    .describe("The symbol of the token to teleport."),
  sender: z.string().describe("A wallet address to teleport from."),
  recipient: z
    .string()
    .optional()
    .describe(
      "An optional recipient wallet address. If not provided, the sender address will be used.",
    ),
});

type XcmAgentInput = z.infer<typeof _xcmAgentInputSchema>;

const xcmAgent = tool({
  name: "xcmAgent",
  description:
    "Prepare and confirm a SINGLE XCM transaction to teleport tokens on the Polkadot, Westend and Paseo network. **NEVER use this tool for multiple teleports** - if the user requests multiple teleports (e.g., 'teleport X to A and teleport Y to B'), you MUST use `batchAgent` or `batchAllAgent` instead. This tool is ONLY for single teleport transactions.",
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    src: z.string().describe("The source network/chain to teleport from."),
    dst: z.string().describe("The destination network/chain to teleport to."),
    amount: z.number().describe("The amount of tokens to teleport."),
    symbol: z
      .enum(["DOT", "WND", "PAS"])
      .describe("The symbol of the token to teleport."),
    sender: z.string().describe("A wallet address to teleport from."),
    recipient: z
      .string()
      .optional()
      .describe(
        "An optional recipient wallet address. If not provided, the sender address will be used.",
      ),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  outputSchema: z.object({
    tx: z
      .object({
        src: z.string(),
        dst: z.string(),
        amount: z.number(),
        symbol: z.enum(["DOT", "WND", "PAS"]),
        sender: z.string(),
        recipient: z.string(),
      })
      .optional(),
    message: z.string().optional(),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input: XcmAgentInput) => {
    const { src, dst, amount, symbol, sender, recipient } = input;
    try {
      // Step 1: Validate that the provided chain names are valid, user-friendly names
      const validSourceChains = Object.keys(CHAINS[symbol]);
      const validDestinationChains = Object.keys(CHAINS[symbol]);

      if (
        !validSourceChains.some(
          (chain) => chain.toLowerCase() === src.toLowerCase(),
        )
      ) {
        return {
          message: `Invalid source chain: '${src}'. Please use one of the following: ${validSourceChains.join(", ")}`,
        };
      }

      if (
        !validDestinationChains.some(
          (chain) => chain.toLowerCase() === dst.toLowerCase(),
        )
      ) {
        return {
          message: `Invalid destination chain: '${dst}'. Please use one of the following: ${validDestinationChains.join(", ")}`,
        };
      }

      // Step 2: Get the node names (system names) for the chains
      const srcNodeName = getNodeName({ name: src, symbol });
      const dstNodeName = getNodeName({ name: dst, symbol });

      if (!srcNodeName || !dstNodeName) {
        return {
          message:
            "Could not resolve provided chain names to internal node names.",
        };
      }

      // Step 3: Block teleports where source and destination are the same
      if (srcNodeName === dstNodeName) {
        return {
          message: `Invalid teleport: The source and destination chains cannot be the same. Both were resolved to '${srcNodeName}'.`,
        };
      }

      // Block the specific teleport path between PAssetHub and Paseo AssetHub (both directions)
      const isPAssetHubToPaseoAssetHub =
        (srcNodeName === "PAssetHub" && dstNodeName === "AssetHubPaseo") ||
        (srcNodeName === "AssetHubPaseo" && dstNodeName === "PAssetHub");

      if (isPAssetHubToPaseoAssetHub) {
        return {
          message:
            "Teleport transactions between PAssetHub and Paseo AssetHub are currently not supported. You can teleport between PAssetHub and Paseo relay chain instead.",
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

      const recipientAddress = recipient ?? convertSs58(sender, dstNodeName);

      return {
        tx: {
          src, // Return the original user-friendly name
          dst, // Return the original user-friendly name
          amount,
          sender,
          symbol,
          recipient: recipientAddress,
        },
        message: `
        Summary
        ---
        Source: ${src}
        Destination: ${dst}
        Amount: ${amount.toFixed(3)} ${symbol}
        Sender: ${sender}
        Recipient: ${recipientAddress}
        ---
        Teleport of ${amount.toFixed(3)} ${symbol} from ${src} to ${dst} has been prepared. Sign and submit the transaction to confirm the teleport.`,
      };
    } catch (error) {
      const err = error as Error;
      return {
        message: `Failed to prepare teleport: ${err.message}`,
      };
    }
  },
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _xcmStablecoinFromAssetHubInputSchema = z.object({
  src: z.string().describe("The source network/chain to teleport from."),
  dst: z.string().describe("The destination network/chain to teleport to."),
  amount: z.number().describe("The amount of stablecoins to transfer."),
  symbol: z
    .enum(["USDT", "USDC"])
    .describe("The symbol of the stablecoin to transfer."),
  recipient: z.string().describe("The recipient address to transfer to."),
});

type XcmStablecoinFromAssetHubInput = z.infer<
  typeof _xcmStablecoinFromAssetHubInputSchema
>;

const xcmStablecoinFromAssetHub = tool({
  name: "xcmStablecoinFromAssetHub",
  description:
    "This tool is used to send or teleport stablecoins (USDT or USDC).",
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    src: z.string().describe("The source network/chain to teleport from."),
    dst: z.string().describe("The destination network/chain to teleport to."),
    amount: z.number().describe("The amount of stablecoins to transfer."),
    symbol: z
      .enum(["USDT", "USDC"])
      .describe("The symbol of the stablecoin to transfer."),
    recipient: z.string().describe("The recipient address to transfer to."),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  outputSchema: z.object({
    tx: z
      .object({
        src: z.enum(SUBSTRATE_CHAINS),
        dst: z.enum(SUBSTRATE_CHAINS),
        amount: z.number(),
        symbol: z.enum(["USDT", "USDC"]),
        id: z.number(),
        recipient: z.string(),
      })
      .optional(),
    message: z.string().optional(),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input: XcmStablecoinFromAssetHubInput) => {
    const { src, dst, amount, symbol, recipient } = input;
    if (!recipient) {
      return {
        message: "Please provide a wallet address to teleport to.",
      };
    }

    try {
      const srcNodeName = getNodeName({ name: src, symbol: "DOT" });
      const dstNodeName = getNodeName({ name: dst, symbol: "DOT" });

      if (!srcNodeName) {
        return {
          message: `Invalid source chain for ${symbol} transfer.`,
        };
      }

      if (!dstNodeName) {
        return {
          message: `Invalid destination chain for ${symbol} transfer.`,
        };
      }

      if (srcNodeName !== "AssetHubPolkadot") {
        return {
          message: `${src} cannot be used to teleport ${symbol}.`,
        };
      }

      if (dstNodeName !== "Hydration" && dstNodeName !== "Moonbeam") {
        return {
          message: `${dst} cannot be used to teleport ${symbol}.`,
        };
      }

      const isEthereum = dstNodeName === "Moonbeam";

      if (!isEthereum && !isValidSS58Address(recipient)) {
        return {
          message: `The provided recipient address is not valid SS58 address. ${recipient}`,
        };
      }

      if (isEthereum && !isValidEthereumAddress(recipient)) {
        return {
          message: `The provided recipient address is not valid Ethereum address. ${recipient}`,
        };
      }

      return {
        tx: {
          src: srcNodeName,
          dst: dstNodeName,
          amount,
          recipient,
          symbol,
          id: symbol === "USDT" ? 1984 : 1337,
        },
        message: `
        Summary
        ---
        Source: ${srcNodeName}
        Destination: ${dstNodeName}
        Amount: ${amount.toFixed(3)} ${symbol}
        Recipient: ${recipient}
        ---
        Teleport of ${amount.toFixed(3)} ${symbol} from ${src} to ${dst} has been prepared. Sign and submit the transaction to confirm the teleport.`,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        message: `Failed to prepare transfer: ${err.message}`,
      };
    }
  },
});

export {
  getAvailableRelayChains,
  getAvailableSystemChains,
  xcmAgent,
  xcmStablecoinFromAssetHub,
};
