import {
  MIN_POOL_BOND_AMOUNT,
  SYMBOL_TO_RELAY_CHAIN,
  UNBONDING_PERIOD_DAYS_MAP,
} from "@/constants/chains";
import { isValidSS58Address } from "@/lib/utils";
import { tool } from "ai";
import z from "zod";

export const joinNominationPoolsAgent = tool({
  description:
    "Join an existing nomination pool on a network within the Polkadot ecosystem (e.g., Polkadot, Kusama, Westend, Paseo) by bonding a specified amount of tokens. You will receive staking rewards proportionally from the pool. Note: You can only be a member of one pool at a time. A network-specific minimum bond amount is required to join a pool, and you need to ensure your account maintains its existential deposit plus transaction fees.",
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
      .optional()
      .default("DOT")
      .describe(
        "The token symbol of the network you are joining the pool on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
      ),
  }),
  outputSchema: z.object({
    tx: z
      .object({
        amount: z.number(),
        poolId: z.number().int().min(1),
      })
      .optional(),
    message: z.string(),
  }),

  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ senderAddress, amount, poolId, tokenSymbol, network }) => {
    const chain = SYMBOL_TO_RELAY_CHAIN[tokenSymbol];
    const minBondAmount = MIN_POOL_BOND_AMOUNT[tokenSymbol] || 1;

    if (amount < minBondAmount) {
      return {
        message: `The minimum bond amount for joining a pool on ${chain} is ${minBondAmount.toFixed(2)} ${tokenSymbol}.`,
      };
    }

    if (!poolId) {
      return {
        message: "Please provide a valid pool ID.",
      };
    }

    if (
      chain !== network &&
      ["polkadot", "kusama", "westend", "paseo"].includes(network.toLowerCase())
    ) {
      return {
        message: `${network} is a relay chain and cannot be used for staking ${tokenSymbol}.`,
      };
    }
    if (
      chain !== network &&
      !["polkadot", "kusama", "westend", "paseo"].includes(
        network.toLowerCase(),
      )
    ) {
      return {
        message: `${network} is a system chain and cannot be used for staking ${tokenSymbol}.`,
      };
    }

    return {
      tx: {
        amount,
        poolId,
      },
      message: `
      senderAddress: ${senderAddress}
      amount: ${amount.toFixed(2)} ${tokenSymbol}
      poolId: ${poolId.toFixed(0)}
      An staking request for ${amount.toFixed(2)} ${tokenSymbol} on ${network} has been prepared for pool ID ${poolId.toFixed(0)}. Please sign and submit the transaction to join the pool.
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

export const bondExtraNominationPoolsAgent = tool({
  description:
    "Add more tokens to your existing bonded stake in a nomination pool on a network within the Polkadot ecosystem (e.g., Polkadot, Kusama, Westend, Paseo). You can either bond additional tokens from your account's free balance or re-stake your accumulated (unclaimed) rewards.",
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
      .optional()
      .default("DOT")
      .describe(
        "The token symbol of the network you are bonding extra funds on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
      ),
  }),
  outputSchema: z.object({
    tx: bondExtraParamSchema.optional(),
    message: z.string(),
  }),

  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ memberAddress, extra, tokenSymbol, network }) => {
    const chain = SYMBOL_TO_RELAY_CHAIN[tokenSymbol];

    if (
      chain !== network &&
      ["polkadot", "kusama", "westend", "paseo"].includes(network.toLowerCase())
    ) {
      return {
        message: `${network} is a relay chain and cannot be used for staking ${tokenSymbol}.`,
      };
    }
    if (
      chain !== network &&
      !["polkadot", "kusama", "westend", "paseo"].includes(
        network.toLowerCase(),
      )
    ) {
      return {
        message: `${network} is a system chain and cannot be used for staking ${tokenSymbol}.`,
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
        amount: ${extra.amount.toFixed(2)} ${tokenSymbol}
        A bond extra request of ${extra.amount.toFixed(2)} ${tokenSymbol} on ${network} has been prepared. Bonding happens from your free balance. Please sign and submit the transaction to bond extra funds.`,
      };
    }

    if (extra.type === "Rewards") {
      return {
        tx: {
          type: extra.type,
          amount: undefined,
        },
        message: `
        senderAddress: ${memberAddress}
        A bond extra request of ${tokenSymbol} on ${network} has been prepared. Bonding happens by re-staking accumulated rewards. Please sign and submit the transaction to bond extra funds.`,
      };
    }
  },
});

export const unbondFromNominationPoolsAgent = tool({
  description:
    "Initiate the unbonding process for a specified amount of tokens (referred to as 'unbonding points') from a nomination pool you are currently a member of, on a network within the Polkadot ecosystem (e.g., Polkadot, Kusama, Westend, Paseo). The unbonded funds will become available for withdrawal after a network-specific unbonding period.",
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
      .optional()
      .default("DOT")
      .describe(
        "The token symbol of the network you are unbonding from (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
      ),
  }),
  outputSchema: z.object({
    tx: z
      .object({
        memberAddress: z.string(),
        unbondingPoints: z.number(),
      })
      .optional(),
    message: z.string(),
  }),

  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ memberAddress, unbondingPoints, tokenSymbol, network }) => {
    const chain = SYMBOL_TO_RELAY_CHAIN[tokenSymbol];
    const unbondingDays = UNBONDING_PERIOD_DAYS_MAP[tokenSymbol] || 28;
    if (
      chain !== network &&
      ["polkadot", "kusama", "westend", "paseo"].includes(network.toLowerCase())
    ) {
      return {
        message: `${network} is a relay chain and cannot be used for staking ${tokenSymbol}.`,
      };
    }
    if (
      chain !== network &&
      !["polkadot", "kusama", "westend", "paseo"].includes(
        network.toLowerCase(),
      )
    ) {
      return {
        message: `${network} is a system chain and cannot be used for staking ${tokenSymbol}.`,
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
      amount: ${unbondingPoints.toFixed(2)} ${tokenSymbol}
      An unbonding request for ${unbondingPoints.toFixed(2)} ${tokenSymbol} on ${network} has been prepared. The tokens will become available after an unbonding period of ${unbondingDays.toFixed(0)} days. Please sign and submit the transaction to initiate the unbonding process.
      `,
      tx: {
        memberAddress,
        unbondingPoints,
      },
    };
  },
});
