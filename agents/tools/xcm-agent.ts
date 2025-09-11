import { getNodeName, isAssetSupported } from "@/lib/paraspell";
import { isValidEthereumAddress, isValidSS58Address } from "@/lib/utils";
import {
  convertSs58,
  hasSupportForAsset,
  NODES_WITH_RELAY_CHAINS,
  NODES_WITH_RELAY_CHAINS_DOT_KSM,
} from "@paraspell/sdk";
import { tool } from "ai";
import z from "zod";

export const getSupportedXcmChains = tool({
  name: "getSupportedXcmChains",
  description:
    "Get the list of supported XCM chains for teleporting tokens for the active network.",
  inputSchema: z.object({
    chain: z
      .string()
      .describe(
        "The name of the network/chain to get the list of supported XCM chains for.",
      )
      .optional(),
  }),
});

export const xcmAgent = tool({
  name: "xcmAgent",
  description:
    "Prepare and confirm an XCM transaction to teleport tokens on the Polkadot, Westend and Paseo network. Teleportation can be done from same addresses i.e. sender and recipient are the same. or from different addresses. i.e. sender and recipient are different.",
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
      .describe(
        "A wallet address to teleport to. It's possible that sender and recipient can be the same.",
      ),
  }),
  outputSchema: z.object({
    tx: z
      .object({
        src: z.enum(NODES_WITH_RELAY_CHAINS_DOT_KSM),
        dst: z.enum(NODES_WITH_RELAY_CHAINS_DOT_KSM),
        amount: z.number(),
        symbol: z.enum(["DOT", "WND", "PAS"]),
        sender: z.string(),
        recipient: z.string(),
      })
      .optional(),
    message: z.string(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ src, dst, amount, symbol, sender, recipient }) => {
    try {
      const srcNodeName = getNodeName({ name: src, symbol });
      const dstNodeName = getNodeName({ name: dst, symbol });

      if (!srcNodeName || !dstNodeName) {
        return {
          message: "Invalid source or destination network/chain.",
        };
      }

      if (!isValidSS58Address(sender)) {
        return {
          message: "Invalid sender address.",
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

      const senderAddress = convertSs58(sender, srcNodeName);
      const recipientAddress = convertSs58(recipient, dstNodeName);
      // eslint-disable-next-line no-console
      console.log({
        senderAddress,
        recipientAddress,
        srcNodeName,
        dstNodeName,
      });

      return {
        tx: {
          src: srcNodeName,
          dst: dstNodeName,
          amount,
          sender: senderAddress,
          recipient: recipientAddress,
          symbol,
        },
        message: `
        Summary
        ---
        Source: ${srcNodeName}
        Destination: ${dstNodeName}
        Amount: ${amount.toFixed(3)} ${symbol}
        Sender: ${senderAddress}
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

export const xcmStablecoinFromAssetHub = tool({
  name: "xcmStablecoinFromAssetHub",
  description:
    "This tool is used to send or teleport stablecoins (USDT or USDC).",
  inputSchema: z.object({
    src: z.string().describe("The source network/chain to teleport from."),
    dst: z.string().describe("The destination network/chain to teleport to."),
    amount: z.number().describe("The amount of stablecoins to transfer."),
    symbol: z
      .enum(["USDT", "USDC"])
      .describe("The symbol of the stablecoin to transfer."),
    recipient: z.string().describe("The recipient address to transfer to."),
  }),
  outputSchema: z.object({
    tx: z
      .object({
        src: z.enum(NODES_WITH_RELAY_CHAINS),
        dst: z.enum(NODES_WITH_RELAY_CHAINS),
        amount: z.number(),
        symbol: z.enum(["USDT", "USDC"]),
        id: z.number(),
        recipient: z.string(),
      })
      .optional(),
    message: z.string().optional(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ src, dst, amount, symbol, recipient }) => {
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
