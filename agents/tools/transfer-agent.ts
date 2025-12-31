/* eslint-disable @typescript-eslint/ban-ts-comment -- TypeScript compiler shows errors but ESLint parser doesn't, so we use @ts-ignore */
import { isValidSS58Address } from "@/lib/utils";
import { tool } from "ai";
import z from "zod";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _transferAgentInputSchema = z.object({
  to: z.string().describe("A SS58-encoded wallet address to transfer to."),
  token: z.string().describe("The symbol of the token to transfer."),
  amount: z
    .number()
    .describe("The amount of tokens to transfer. Must be a positive number."),
});

type TransferAgentInput = z.infer<typeof _transferAgentInputSchema>;

export const transferAgent = tool({
  name: "transferAgent",
  description:
    "Prepare and confirm a SINGLE transfer of tokens on the Polkadot network. **CRITICAL: This tool is ONLY for ONE transfer. If the user requests MULTIPLE transfers (e.g., 'transfer 10 PAS to Address1 and transfer 20 PAS to Address2') or multiple actions in one message (e.g., 'transfer X and bond Y'), DO NOT use this tool. Use batchAgent or batchAllAgent instead. NEVER call this tool multiple times for multiple transfers - always use batchAgent or batchAllAgent with multiple transfer transactions.**",
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    to: z.string().describe("A SS58-encoded wallet address to transfer to."),
    token: z.string().describe("The symbol of the token to transfer."),
    amount: z
      .number()
      .describe("The amount of tokens to transfer. Must be a positive number."),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  outputSchema: z.object({
    tx: z
      .object({
        to: z.string(),
        amount: z.number(),
      })
      .optional(),
    message: z.string().optional(),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input: TransferAgentInput) => {
    const { to, amount, token } = input;
    try {
      if (isValidSS58Address(to)) {
        return {
          tx: {
            to,
            amount,
          },
          message: `Transfer of ${String(amount)} ${token} tokens to ${to} has been prepared. Sign and submit the transaction to confirm the transfer.`,
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
