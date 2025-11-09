/* eslint-disable @typescript-eslint/ban-ts-comment -- TypeScript compiler shows errors but ESLint parser doesn't, so we use @ts-ignore */
import {
  MIN_POOL_BOND_AMOUNT,
  SYMBOL_TO_RELAY_CHAIN,
  UNBONDING_PERIOD_DAYS_MAP,
} from "@/constants/chains";
import { isValidSS58Address } from "@/lib/utils";
import { tool } from "ai";
import z from "zod";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _joinNominationPoolsInputSchema = z.object({
  network: z.string().describe("The name of the active network/chain."),
  senderAddress: z
    .string()
    .describe(
      "The address on the respective network that will bond tokens to join the pool. This account must have the tokens to bond.",
    ),
  amount: z
    .number()
    .describe(
      "The amount of tokens to bond (e.g., '10', '0.5'). The token symbol will be inferred from the tool's tokenSymbol parameter.",
    ),
  poolId: z
    .number()
    .int()
    .min(1)
    .describe(
      "The ID of the nomination pool you wish to join. You can typically find this ID on network-specific staking dashboards or pool explorers.",
    ),
  tokenSymbol: z
    .enum(["DOT", "KSM", "WND", "PAS"])
    .default("DOT")
    .describe(
      "The token symbol of the network you are joining the pool on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
    ),
});

type JoinNominationPoolsInput = z.infer<typeof _joinNominationPoolsInputSchema>;

export const joinNominationPoolsAgent = tool({
  description:
    "Join an existing nomination pool on a network within the Polkadot ecosystem. IMPORTANT: Nomination pools locations - All networks (Polkadot, Kusama, Westend, Paseo): Use their respective AssetHub chains (Polkadot AssetHub, Kusama AssetHub, Westend AssetHub, Paseo AssetHub) as nomination pools have migrated there. You will receive staking rewards proportionally from the pool. Note: You can only be a member of one pool at a time. A network-specific minimum bond amount is required to join a pool, and you need to ensure your account maintains its existential deposit plus transaction fees.",
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    network: z.string().describe("The name of the active network/chain."),
    senderAddress: z
      .string()
      .describe(
        "The address on the respective network that will bond tokens to join the pool. This account must have the tokens to bond.",
      ),
    amount: z
      .number()
      .describe(
        "The amount of tokens to bond (e.g., '10', '0.5'). The token symbol will be inferred from the tool's tokenSymbol parameter.",
      ),
    poolId: z
      .number()
      .int()
      .min(1)
      .describe(
        "The ID of the nomination pool you wish to join. You can typically find this ID on network-specific staking dashboards or pool explorers.",
      ),
    tokenSymbol: z
      .enum(["DOT", "KSM", "WND", "PAS"])
      .default("DOT")
      .describe(
        "The token symbol of the network you are joining the pool on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
      ),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  outputSchema: z.object({
    tx: z
      .object({
        amount: z.number(),
        poolId: z.number().int().min(1),
      })
      .optional(),
    message: z.string(),
  }),

  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input: JoinNominationPoolsInput) => {
    const { senderAddress, amount, poolId, tokenSymbol, network } = input;
    const symbol = tokenSymbol;
    const relayChain = SYMBOL_TO_RELAY_CHAIN[symbol];
    const minBondAmount = MIN_POOL_BOND_AMOUNT[symbol] || 1;
    const normalizedNetwork = network.trim().toLowerCase();

    if (amount < minBondAmount) {
      return {
        message: `The minimum bond amount for joining a pool is ${minBondAmount.toFixed(2)} ${symbol}.`,
      };
    }

    if (!poolId) {
      return {
        message: "Please provide a valid pool ID.",
      };
    }

    // Check if user is on the correct chain for nomination pools
    // All chains (including Polkadot): nomination pools have migrated to AssetHub
    const relayChainLower = relayChain.toLowerCase();
    const assetHubName = `${relayChain} AssetHub`.toLowerCase();
    const isRelayChain =
      normalizedNetwork === relayChainLower ||
      normalizedNetwork === "polkadot" ||
      normalizedNetwork === "kusama" ||
      normalizedNetwork === "westend" ||
      normalizedNetwork === "paseo";
    const isAssetHub =
      normalizedNetwork === assetHubName ||
      normalizedNetwork === "polkadot assethub" ||
      normalizedNetwork === "westend assethub" ||
      normalizedNetwork === "paseo assethub";

    if (isRelayChain || !isAssetHub) {
      return {
        message: `This operation is not possible on ${network}. Nomination pools for ${symbol} are only available on ${relayChain} AssetHub. Please switch to ${relayChain} AssetHub to perform this operation.`,
      };
    }

    return {
      tx: {
        amount,
        poolId,
      },
      message: `
      senderAddress: ${senderAddress}
      amount: ${amount.toFixed(2)} ${symbol}
      poolId: ${poolId.toFixed(0)}
      An staking request for ${amount.toFixed(2)} ${symbol} on ${network} has been prepared for pool ID ${poolId.toFixed(0)}. Please sign and submit the transaction to join the pool.
      `,
    };
  },
});

const bondExtraFreeBalanceSchema = z.object({
  type: z
    .literal("FreeBalance")
    .describe("Add funds from your account's transferable balance."),
  amount: z
    .number()
    .describe(
      "The amount of tokens from your free balance to add to your bonded stake (e.g., '5', '0.2'). The token symbol will be inferred from the tool's tokenSymbol parameter.",
    ),
});

const bondExtraRewardsSchema = z.object({
  type: z
    .literal("Rewards")
    .describe(
      "Re-stake any accumulated (unclaimed) staking rewards from the pool.",
    ),
});

const bondExtraParamSchema = z
  .discriminatedUnion("type", [
    bondExtraFreeBalanceSchema,
    bondExtraRewardsSchema,
  ])
  .describe(
    "Specify whether to bond additional funds from your free balance or by re-staking accumulated rewards.",
  );

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _bondExtraNominationPoolsInputSchema = z.object({
  network: z.string().describe("The name of the active network/chain."),
  memberAddress: z
    .string()
    .describe(
      "The address of the pool member who wants to bond extra funds on the respective network. This account must already be a member of a nomination pool.",
    ),
  extra: bondExtraParamSchema,
  tokenSymbol: z
    .enum(["DOT", "KSM", "WND", "PAS"])
    .default("DOT")
    .describe(
      "The token symbol of the network you are bonding extra funds on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
    ),
});

type BondExtraNominationPoolsInput = z.infer<
  typeof _bondExtraNominationPoolsInputSchema
>;

export const bondExtraNominationPoolsAgent = tool({
  description:
    "Add more tokens to your existing bonded stake in a nomination pool on a network within the Polkadot ecosystem. IMPORTANT: Nomination pools locations - All networks (Polkadot, Kusama, Westend, Paseo): Use their respective AssetHub chains (Polkadot AssetHub, Kusama AssetHub, Westend AssetHub, Paseo AssetHub) as nomination pools have migrated there. You can either bond additional tokens from your account's free balance or re-stake your accumulated (unclaimed) rewards.",
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    network: z.string().describe("The name of the active network/chain."),
    memberAddress: z
      .string()
      .describe(
        "The address of the pool member who wants to bond extra funds on the respective network. This account must already be a member of a nomination pool.",
      ),
    extra: bondExtraParamSchema,
    tokenSymbol: z
      .enum(["DOT", "KSM", "WND", "PAS"])
      .default("DOT")
      .describe(
        "The token symbol of the network you are bonding extra funds on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
      ),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  outputSchema: z.object({
    tx: bondExtraParamSchema.optional(),
    message: z.string(),
  }),

  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input: BondExtraNominationPoolsInput) => {
    const { memberAddress, extra, tokenSymbol, network } = input;
    const symbol = tokenSymbol;
    const relayChain = SYMBOL_TO_RELAY_CHAIN[symbol];
    const normalizedNetwork = network.trim().toLowerCase();

    // Check if user is on the correct chain for nomination pools
    // All chains (including Polkadot): nomination pools have migrated to AssetHub
    const relayChainLower = relayChain.toLowerCase();
    const assetHubName = `${relayChain} AssetHub`.toLowerCase();
    const isRelayChain =
      normalizedNetwork === relayChainLower ||
      normalizedNetwork === "polkadot" ||
      normalizedNetwork === "kusama" ||
      normalizedNetwork === "westend" ||
      normalizedNetwork === "paseo";
    const isAssetHub =
      normalizedNetwork === assetHubName ||
      normalizedNetwork === "polkadot assethub" ||
      normalizedNetwork === "westend assethub" ||
      normalizedNetwork === "paseo assethub";

    if (isRelayChain || !isAssetHub) {
      return {
        message: `This operation is not possible on ${network}. Nomination pools for ${symbol} are only available on ${relayChain} AssetHub. Please switch to ${relayChain} AssetHub to perform this operation.`,
      };
    }

    if (extra.type === "FreeBalance" && extra.amount) {
      if (extra.amount <= 0) {
        return {
          message:
            "Invalid amount: Please provide a positive numeric value for FreeBalance.",
        };
      }
      return {
        tx: {
          type: extra.type,
          amount: extra.amount,
        },
        message: `
        senderAddress: ${memberAddress}
        amount: ${extra.amount.toFixed(2)} ${symbol}
        A bond extra request of ${extra.amount.toFixed(2)} ${symbol} on ${network} has been prepared. Bonding happens from your free balance. Please sign and submit the transaction to bond extra funds.`,
      };
    }

    if (extra.type === "Rewards") {
      return {
        tx: {
          type: extra.type,
        },
        message: `
        senderAddress: ${memberAddress}
        A bond extra request of ${symbol} on ${network} has been prepared. Bonding happens by re-staking accumulated rewards. Please sign and submit the transaction to bond extra funds.`,
      };
    }
  },
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unbondFromNominationPoolsInputSchema = z.object({
  network: z.string().describe("The name of the active network/chain."),
  memberAddress: z
    .string()
    .describe(
      "The address on the respective network of the pool member initiating the unbonding. This is the 'AccountId' part of 'memberAccount'.",
    ),
  unbondingPoints: z
    .number()
    .describe(
      "The amount of tokens (as 'unbonding points') to unbond from the pool (e.g., '5', '0.2'). This amount will enter the unbonding queue. The token symbol will be inferred from the tool's tokenSymbol parameter. This corresponds to 'Compact<u128> (BalanceOf)'.",
    ),
  tokenSymbol: z
    .enum(["DOT", "KSM", "WND", "PAS"])
    .default("DOT")
    .describe(
      "The token symbol of the network you are unbonding from (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
    ),
});

type UnbondFromNominationPoolsInput = z.infer<
  typeof _unbondFromNominationPoolsInputSchema
>;

export const unbondFromNominationPoolsAgent = tool({
  description:
    "Initiate the unbonding process for a specified amount of tokens (referred to as 'unbonding points') from a nomination pool you are currently a member of, on a network within the Polkadot ecosystem. IMPORTANT: Nomination pools locations - All networks (Polkadot, Kusama, Westend, Paseo): Use their respective AssetHub chains (Polkadot AssetHub, Kusama AssetHub, Westend AssetHub, Paseo AssetHub) as nomination pools have migrated there. The unbonded funds will become available for withdrawal after a network-specific unbonding period.",
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    network: z.string().describe("The name of the active network/chain."),
    memberAddress: z
      .string()
      .describe(
        "The address on the respective network of the pool member initiating the unbonding. This is the 'AccountId' part of 'memberAccount'.",
      ),
    unbondingPoints: z
      .number()
      .describe(
        "The amount of tokens (as 'unbonding points') to unbond from the pool (e.g., '5', '0.2'). This amount will enter the unbonding queue. The token symbol will be inferred from the tool's tokenSymbol parameter. This corresponds to 'Compact<u128> (BalanceOf)'.",
      ),
    tokenSymbol: z
      .enum(["DOT", "KSM", "WND", "PAS"])
      .default("DOT")
      .describe(
        "The token symbol of the network you are unbonding from (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
      ),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  outputSchema: z.object({
    tx: z
      .object({
        memberAddress: z.string(),
        unbondingPoints: z.number(),
      })
      .optional(),
    message: z.string(),
  }),

  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input: UnbondFromNominationPoolsInput) => {
    const { memberAddress, unbondingPoints, tokenSymbol, network } = input;
    const symbol = tokenSymbol;
    const relayChain = SYMBOL_TO_RELAY_CHAIN[symbol];
    const unbondingDays = UNBONDING_PERIOD_DAYS_MAP[symbol] || 28;
    const normalizedNetwork = network.trim().toLowerCase();

    // Check if user is on the correct chain for nomination pools
    // All chains (including Polkadot): nomination pools have migrated to AssetHub
    const relayChainLower = relayChain.toLowerCase();
    const assetHubName = `${relayChain} AssetHub`.toLowerCase();
    const isRelayChain =
      normalizedNetwork === relayChainLower ||
      normalizedNetwork === "polkadot" ||
      normalizedNetwork === "kusama" ||
      normalizedNetwork === "westend" ||
      normalizedNetwork === "paseo";
    const isAssetHub =
      normalizedNetwork === assetHubName ||
      normalizedNetwork === "polkadot assethub" ||
      normalizedNetwork === "westend assethub" ||
      normalizedNetwork === "paseo assethub";

    if (isRelayChain || !isAssetHub) {
      return {
        message: `This operation is not possible on ${network}. Nomination pools for ${symbol} are only available on ${relayChain} AssetHub. Please switch to ${relayChain} AssetHub to perform this operation.`,
      };
    }

    if (unbondingPoints <= 0) {
      return {
        message:
          "Please provide a positive numeric value for unbonding points.",
      };
    }

    if (!memberAddress) {
      return {
        message: "Please provide a member address.",
      };
    }

    if (!isValidSS58Address(memberAddress)) {
      return {
        message: "The provided member address is not valid SS58 address.",
      };
    }

    return {
      message: `
      senderAddress: ${memberAddress}
      amount: ${unbondingPoints.toFixed(2)} ${symbol}
      An unbonding request for ${unbondingPoints.toFixed(2)} ${symbol} on ${network} has been prepared. The tokens will become available after an unbonding period of ${unbondingDays.toFixed(0)} days. Please sign and submit the transaction to initiate the unbonding process.
      `,
      tx: {
        memberAddress,
        unbondingPoints,
      },
    };
  },
});
