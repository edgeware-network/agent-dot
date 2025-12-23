/* eslint-disable @typescript-eslint/ban-ts-comment -- TypeScript compiler shows errors but ESLint parser doesn't, so we use @ts-ignore */
import { tool } from "ai";
import z from "zod";

// Transaction type schemas
const transferTransactionSchema = z.object({
  type: z.literal("transfer"),
  to: z.string().describe("SS58-encoded recipient address"),
  amount: z.number().describe("Amount of tokens to transfer"),
});

const bondTransactionSchema = z.object({
  type: z.literal("bond"),
  amount: z.number().describe("Amount to bond"),
  payee: z
    .object({
      type: z.enum(["Staked", "Stash", "Controller", "Account", "None"]),
      value: z.string().optional(),
    })
    .describe("Reward destination"),
});

const unbondTransactionSchema = z.object({
  type: z.literal("unbond"),
  amount: z.number().describe("Amount to unbond"),
});

const bondExtraTransactionSchema = z.object({
  type: z.literal("bondExtra"),
  amount: z.number().describe("Additional amount to bond"),
});

const nominateTransactionSchema = z.object({
  type: z.literal("nominate"),
  targets: z
    .array(z.string())
    .min(1)
    .describe("Array of validator addresses to nominate"),
});

const joinPoolTransactionSchema = z.object({
  type: z.literal("joinPool"),
  poolId: z.number().int().min(1).describe("Nomination pool ID"),
  amount: z.number().describe("Amount to bond to the pool"),
});

const bondExtraPoolTransactionSchema = z.object({
  type: z.literal("bondExtraPool"),
  amount: z
    .number()
    .optional()
    .describe(
      "Amount to bond extra (REQUIRED if extraType is FreeBalance, NOT needed if extraType is Rewards). Use this for NOMINATION POOLS only.",
    ),
  extraType: z
    .enum(["FreeBalance", "Rewards"])
    .describe(
      "Type of bond extra: FreeBalance for additional tokens (requires amount), Rewards for restaking rewards (no amount needed). Use this for NOMINATION POOLS only.",
    ),
});

const unbondPoolTransactionSchema = z.object({
  type: z.literal("unbondPool"),
  amount: z
    .number()
    .describe(
      "Amount to unbond from pool. Use this for NOMINATION POOLS only.",
    ),
});

const xcmTransactionSchema = z.object({
  type: z.literal("xcm"),
  src: z
    .string()
    .describe(
      "The source chain name. CRITICAL: When user says 'on Paseo', they mean 'Paseo' relay chain, NOT 'Paseo AssetHub'. Same for Polkadot and Westend.",
    ),
  dst: z
    .string()
    .describe(
      "The destination chain name. CRITICAL: When user says 'on Paseo', they mean 'Paseo' relay chain, NOT 'Paseo AssetHub'. Same for Polkadot and Westend.",
    ),
  recipient: z.string().describe("The recipient's SS58 address"),
  amount: z.number().describe("The amount of tokens to teleport"),
  symbol: z.string().describe("The token symbol (e.g., PAS, WND, DOT)"),
});

// Union of all transaction types
const transactionSchema = z.discriminatedUnion("type", [
  transferTransactionSchema,
  bondTransactionSchema,
  unbondTransactionSchema,
  bondExtraTransactionSchema,
  nominateTransactionSchema,
  joinPoolTransactionSchema,
  bondExtraPoolTransactionSchema,
  unbondPoolTransactionSchema,
  xcmTransactionSchema,
]);

export const batchAgent = tool({
  name: "batchAgent",
  description:
    "**MUST USE THIS TOOL when user requests multiple actions in one message (e.g., 'transfer X and bond Y', 'teleport A to B and C to D').** Batch multiple transactions together using the Utility pallet's batch function. This allows executing multiple transactions in a single call. If one transaction fails, the others will still execute (partial success allowed). **Use this as the DEFAULT for multiple actions unless the user explicitly requests 'batchAll' (atomic).** **NEVER call individual tools (transferAgent, bondAgent, xcmAgent, etc.) when multiple actions are requested together** - always use batchAgent. **CRITICAL: When user mentions 'pool', use bondExtraPool/unbondPool (NOT bondExtra/unbond). When user does NOT mention 'pool', use bondExtra/unbond (NOT bondExtraPool/unbondPool).** **For XCM/teleport transactions, you MUST explicitly confirm the source chain and destination chain in your confirmation message before the wallet popup.** **In your confirmation message, you MUST explicitly state 'I will batch these transactions'.** Supported transaction types: transfer, bond, unbond, bondExtra, nominate, joinPool, bondExtraPool, unbondPool, xcm (teleport). MANDATORY: Ask for explicit confirmation ('yes') before calling this tool.",
  // @ts-ignore - tool function overload issue with inline schemas
  inputSchema: z.object({
    transactions: z
      .array(transactionSchema)
      .min(1)
      .max(50)
      .describe("Array of transactions to batch together"),
    network: z
      .string()
      .optional()
      .describe(
        "The network/chain name. If not provided, uses the active network.",
      ),
  }),
  // @ts-ignore - tool function overload issue with inline schemas
  outputSchema: z.object({
    tx: z
      .object({
        transactionCount: z.number(),
        transactions: z.array(z.any()),
      })
      .optional(),
    message: z.string().optional(),
  }),
  // @ts-ignore - tool function overload issue with inline schemas
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { transactions } = input;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const transactionCount = transactions.length;
      return {
        tx: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          transactionCount,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          transactions,
        },
        message: `Batch transaction prepared with ${String(transactionCount)} transaction(s). Sign and submit to execute all transactions. Note: If one transaction fails, others will still execute.`,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        message: `Failed to prepare batch transaction: ${err.message}`,
      };
    }
  },
});

export const batchAllAgent = tool({
  name: "batchAllAgent",
  description:
    "**MUST USE THIS TOOL when user requests multiple actions in one message AND explicitly mentions 'batchAll', 'batchall', 'batch all', 'batch All', or explicitly states 'atomic' (e.g., 'do batchAll (atomic)').** Batch multiple transactions together using the Utility pallet's batch_all function. This allows executing multiple transactions in a single call. If ANY transaction fails, ALL transactions will be rolled back (atomic). Use this when the user wants to ensure all transactions succeed or none do. **CRITICAL: Use this ONLY if the user explicitly requests 'batchAll' or atomic behavior. If the user just says 'batch', 'send multiple', 'teleport X and Y', or lists actions, use batchAgent instead.** **DO NOT USE THIS TOOL simply because there are multiple actions.** **NEVER call individual tools when multiple actions are requested together** - always use batchAllAgent (if atomic requested) or batchAgent. **CRITICAL: When user mentions 'pool', use bondExtraPool/unbondPool (NOT bondExtra/unbond). When user does NOT mention 'pool', use bondExtra/unbond (NOT bondExtraPool/unbondPool).** **For XCM/teleport transactions, you MUST explicitly confirm the source chain and destination chain in your confirmation message before the wallet popup.** **In your confirmation message, you MUST explicitly state 'I will batchAll these transactions'.** Supported transaction types: transfer, bond, unbond, bondExtra, nominate, joinPool, bondExtraPool, unbondPool, xcm (teleport). MANDATORY: Ask for explicit confirmation ('yes') before calling this tool.",
  // @ts-ignore - tool function overload issue with inline schemas
  inputSchema: z.object({
    transactions: z
      .array(transactionSchema)
      .min(1)
      .max(50)
      .describe("Array of transactions to batch together atomically"),
    network: z
      .string()
      .optional()
      .describe(
        "The network/chain name. If not provided, uses the active network.",
      ),
  }),
  // @ts-ignore - tool function overload issue with inline schemas
  outputSchema: z.object({
    tx: z
      .object({
        transactionCount: z.number(),
        transactions: z.array(z.any()),
      })
      .optional(),
    message: z.string().optional(),
  }),
  // @ts-ignore - tool function overload issue with inline schemas
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { transactions } = input;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const transactionCount = transactions.length;
      return {
        tx: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          transactionCount,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          transactions,
        },
        message: `BatchAll transaction prepared with ${String(transactionCount)} transaction(s). Sign and submit to execute all transactions atomically. Note: If any transaction fails, all will be rolled back.`,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        message: `Failed to prepare batchAll transaction: ${err.message}`,
      };
    }
  },
});
