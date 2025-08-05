import { isValidSS58Address } from "@/lib/utils";
import { tool } from "ai";
import z from "zod";

export const transferAgent = tool({
  name: "transferAgent",
  description:
    "Prepare and confirm a transfer of tokens on the Polkadot network.",
  inputSchema: z.object({
    to: z.string().describe("A SS58-encoded wallet address to transfer to."),
    token: z.string().describe("The symbol of the token to transfer."),
    amount: z
      .number()
      .describe("The amount of tokens to transfer. Must be a positive number."),
  }),
  outputSchema: z.object({
    tx: z
      .object({
        to: z.string(),
        amount: z.number(),
      })
      .optional(),
    message: z.string().optional(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ to, amount, token }) => {
    try {
      if (isValidSS58Address(to)) {
        return {
          tx: {
            to,
            amount,
          },
          message: `Transfer of ${amount.toString()} ${token} tokens to ${to} has been prepared. Sign and submit the transaction to confirm the transfer.`,
        };
      } else {
        return {
          message: "The provided address is not valid SS58 address.",
        };
      }
    } catch (error: unknown) {
      const err = error as Error;
      return {
        message: `Failed to prepare transfer: ${err.message}`,
      };
    }
  },
});
