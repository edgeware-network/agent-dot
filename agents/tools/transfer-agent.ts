import { isValidSS58Address } from "@/lib/utils";
import { tool } from "ai";
import z from "zod";

export const transferAgent = tool({
  name: "transferAgent",
  description:
    "Prepare and confirm a transfer of tokens on the Polkadot network. Do not execute the transfer unless the user explicitly types 'yes' to confirm. First ask for confirmation after showing the details. This agent is used to send DOT, WND, or PAS tokens to another polkadot-compatible wallet address. Always use active account wallet address. Always use active network/chain.",
  inputSchema: z.object({
    to: z.string().describe("A SS58-encoded wallet address to transfer to."),
    amount: z
      .string()
      .describe("The amount of tokens to transfer. Must be a positive number."),
    confirm: z.enum(["yes", "no"]).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    tx: z
      .object({
        to: z.string(),
        amount: z.string(),
      })
      .optional(),
    message: z.string().optional(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ to, amount, confirm }) => {
    if (confirm === "yes") {
      try {
        if (isValidSS58Address(to)) {
          return {
            success: true,
            tx: {
              to,
              amount,
            },
          };
        } else {
          return {
            success: false,
            message: "The provided address is not valid SS58 address.",
          };
        }
      } catch (error: unknown) {
        const err = error as Error;
        return {
          success: false,
          message: `Failed to prepare transfer: ${err.message}`,
        };
      }
    }

    if (confirm === "no") {
      return {
        success: false,
        message: "Transfer cancelled by user.",
      };
    }

    return {
      success: false,
      message: `You are about to transfer ${amount} DOT to ${to}. Are you sure? Type 'yes' to confirm.`,
    };
  },
});
