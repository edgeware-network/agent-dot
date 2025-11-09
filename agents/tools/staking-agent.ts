/* eslint-disable @typescript-eslint/ban-ts-comment -- TypeScript compiler shows errors but ESLint parser doesn't, so we use @ts-ignore */
import {
  MAX_NOMINATIONS,
  SYMBOL_TO_RELAY_CHAIN,
  UNBONDING_PERIOD_DAYS_MAP,
} from "@/constants/chains";
import { isValidSS58Address } from "@/lib/utils";
import { tool } from "ai";
import z from "zod";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _bondAgentInputSchema = z.object({
  stashAccount: z
    .string()
    .describe(
      "The address of the stash account on the respective network. This account holds the locked tokens and should have sufficient balance.",
    ),
  controllerAccount: z
    .string()
    .describe(
      "The address of the controller account on the respective network. This account will be used to sign staking-related transactions like nominating validators, changing bond amount, or claiming rewards. It should have a small transferable balance for transaction fees.",
    ),
  network: z.string().describe("The name of the active network/chain."),
  value: z
    .number()
    .describe(
      "The amount of tokens to bond (e.g., '10', '0.5'). The token symbol should be provided separately in 'tokenSymbol'. This amount will be locked and must meet the network's minimum bond requirement. (Type: Compact<u128> / BalanceOf)",
    ),
  tokenSymbol: z
    .enum(["DOT", "KSM", "WND", "PAS"])
    .default("DOT")
    .describe(
      "The token symbol of the network you are bonding on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
    ),
  payee: z
    .enum(["Staked", "Stash", "Controller", "Account", "None"])
    .describe(
      "Specifies where staking rewards should be sent: 'Staked' (re-bonds rewards), 'Stash' (sends to stash account), 'Controller' (sends to controller account), or 'Account' (sends to a specific address) or 'None'. (Type: PalletStakingRewardDestination)",
    ),
  rewardAccount: z
    .string()
    .optional()
    .describe(
      "Required only if 'payee' is 'Account'. The address on the respective network to which staking rewards should be sent.",
    ),
});

type BondAgentInput = z.infer<typeof _bondAgentInputSchema>;

export const bondAgent = tool({
  name: "bondAgent",
  description:
    "Bond tokens for staking on a Proof-of-Stake network within the Polkadot ecosystem. IMPORTANT: Staking locations - All networks (Polkadot, Kusama, Westend, Paseo): Use their respective AssetHub chains (Polkadot AssetHub, Kusama AssetHub, Westend AssetHub, Paseo AssetHub) as staking has migrated there. This locks a specified amount of tokens from a stash account and sets a controller account to manage staking operations, as well as defining how staking rewards will be received.",
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    stashAccount: z
      .string()
      .describe(
        "The address of the stash account on the respective network. This account holds the locked tokens and should have sufficient balance.",
      ),
    controllerAccount: z
      .string()
      .describe(
        "The address of the controller account on the respective network. This account will be used to sign staking-related transactions like nominating validators, changing bond amount, or claiming rewards. It should have a small transferable balance for transaction fees.",
      ),
    network: z.string().describe("The name of the active network/chain."),
    value: z
      .number()
      .describe(
        "The amount of tokens to bond (e.g., '10', '0.5'). The token symbol should be provided separately in 'tokenSymbol'. This amount will be locked and must meet the network's minimum bond requirement. (Type: Compact<u128> / BalanceOf)",
      ),
    tokenSymbol: z
      .enum(["DOT", "KSM", "WND", "PAS"])
      .default("DOT")
      .describe(
        "The token symbol of the network you are bonding on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
      ),
    payee: z
      .enum(["Staked", "Stash", "Controller", "Account", "None"])
      .describe(
        "Specifies where staking rewards should be sent: 'Staked' (re-bonds rewards), 'Stash' (sends to stash account), 'Controller' (sends to controller account), or 'Account' (sends to a specific address) or 'None'. (Type: PalletStakingRewardDestination)",
      ),
    rewardAccount: z
      .string()
      .optional()
      .describe(
        "Required only if 'payee' is 'Account'. The address on the respective network to which staking rewards should be sent.",
      ),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  outputSchema: z.object({
    tx: z
      .object({
        value: z.number(),
        payee: z.enum(["Staked", "Stash", "Controller", "Account", "None"]),
        rewardAccount: z.string().optional(),
      })
      .optional(),
    message: z.string(),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input: BondAgentInput) => {
    const {
      stashAccount,
      controllerAccount,
      value,
      tokenSymbol,
      payee,
      rewardAccount,
      network,
    } = input;
    const symbol = tokenSymbol;
    const relayChain = SYMBOL_TO_RELAY_CHAIN[symbol];
    const normalizedNetwork = network.trim().toLowerCase();

    try {
      // Check if user is on the correct chain for staking
      // All chains (including Polkadot): staking has migrated to AssetHub
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
          message: `This operation is not possible on ${network}. Staking operations for ${symbol} are only available on ${relayChain} AssetHub. Please switch to ${relayChain} AssetHub to perform this operation.`,
        };
      }
      if (payee === "Account") {
        if (!rewardAccount) {
          return {
            message: "Please provide a reward account address.",
          };
        }
        if (!isValidSS58Address(rewardAccount)) {
          return {
            message:
              "The provided reward account address is not valid SS58 address.",
          };
        }
        return {
          tx: {
            value,
            payee,
            rewardAccount,
          },
          message: `
          stashAccount: ${stashAccount}
          controllerAccount: ${controllerAccount}
          A bond of ${value.toFixed(2)} ${tokenSymbol} tokens on ${network} has been prepared, with rewards sent to ${payee}:${rewardAccount}. Please sign and submit the transaction using wallet to bond the tokens.`,
        };
      } else {
        return {
          tx: {
            value,
            payee,
          },
          message: `
          stashAccount: ${stashAccount}
          controllerAccount: ${controllerAccount}
          A bond of ${value.toFixed(2)} ${tokenSymbol} tokens on ${network} has been prepared, with rewards sent to ${payee}. Please sign and submit the transaction using wallet to bond the tokens.`,
        };
      }
    } catch (error) {
      const err = error as Error;
      return {
        message: `Failed to bond: ${err.message}`,
      };
    }
  },
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _bondExtraAgentInputSchema = z.object({
  controllerAccount: z
    .string()
    .describe(
      "The address of the controller account on the respective network that manages the staking operations.",
    ),
  network: z.string().describe("The name of the active network/chain."),
  maxAdditional: z
    .number()
    .describe(
      "The maximum additional amount of tokens to bond from the stash account's free balance (e.g., '10', '0.5'). The token symbol should be provided separately in 'tokenSymbol'. This amount will be added to the existing bonded amount. (Type: Compact<u128> / BalanceOf)",
    ),
  tokenSymbol: z
    .enum(["DOT", "KSM", "WND", "PAS"])
    .default("DOT")
    .describe(
      "The token symbol of the network you are bonding on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
    ),
});

type BondExtraAgentInput = z.infer<typeof _bondExtraAgentInputSchema>;

export const bondExtraAgent = tool({
  name: "bondExtraAgent",
  description:
    "Add more tokens to an existing bonded stake for staking on a Proof-of-Stake network within the Polkadot ecosystem. IMPORTANT: Staking locations - All networks (Polkadot, Kusama, Westend, Paseo): Use their respective AssetHub chains (Polkadot AssetHub, Kusama AssetHub, Westend AssetHub, Paseo AssetHub) as staking has migrated there. This increases the amount of tokens already locked in the stash account without changing the controller or reward destination. Use this when the account already has bonded tokens and wants to stake more.",
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    controllerAccount: z
      .string()
      .describe(
        "The address of the controller account on the respective network that manages the staking operations.",
      ),
    network: z.string().describe("The name of the active network/chain."),
    maxAdditional: z
      .number()
      .describe(
        "The maximum additional amount of tokens to bond from the stash account's free balance (e.g., '10', '0.5'). The token symbol should be provided separately in 'tokenSymbol'. This amount will be added to the existing bonded amount. (Type: Compact<u128> / BalanceOf)",
      ),
    tokenSymbol: z
      .enum(["DOT", "KSM", "WND", "PAS"])
      .default("DOT")
      .describe(
        "The token symbol of the network you are bonding on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
      ),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  outputSchema: z.object({
    tx: z
      .object({
        maxAdditional: z.number(),
      })
      .optional(),
    message: z.string(),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input: BondExtraAgentInput) => {
    const { controllerAccount, maxAdditional, tokenSymbol, network } = input;
    const symbol = tokenSymbol;
    const relayChain = SYMBOL_TO_RELAY_CHAIN[symbol];
    const normalizedNetwork = network.trim().toLowerCase();

    try {
      if (maxAdditional <= 0) {
        return {
          message: "Please provide a positive numeric value for bonding.",
        };
      }

      if (!controllerAccount) {
        return {
          message: "Please provide a controller account address.",
        };
      }

      if (!isValidSS58Address(controllerAccount)) {
        return {
          message:
            "The provided controller account address is not a valid SS58 address.",
        };
      }

      // Check if user is on the correct chain for staking
      // All chains (including Polkadot): staking has migrated to AssetHub
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
          message: `This operation is not possible on ${network}. Staking operations for ${symbol} are only available on ${relayChain} AssetHub. Please switch to ${relayChain} AssetHub to perform this operation.`,
        };
      }

      return {
        tx: {
          maxAdditional,
        },
        message: `
        controllerAccount: ${controllerAccount}
        A bond extra request of ${maxAdditional.toFixed(2)} ${symbol} tokens on ${network} has been prepared. This will add to your existing bonded stake. Please sign and submit the transaction using your wallet to bond the additional tokens.`,
      };
    } catch (error) {
      const err = error as Error;
      return {
        message: `Failed to prepare bond extra: ${err.message}`,
      };
    }
  },
});

export const getAvailableValidators = tool({
  name: "getAvailableValidators",
  description:
    "Get the list of available validators for staking on a relay chain within the Polkadot ecosystem. Only available on relay chains: Polkadot, Kusama, Westend, or Paseo. The validators will be fetched from the currently active network.",
  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    network: z.string().describe("The name of the active network/chain."),
  }),
  // No execute function - this makes it client-side only
  // The actual execution happens in onChatToolCall in lib/ai.ts
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _nominateAgentInputSchema = z.object({
  network: z.string().describe("The name of active network/chain."),
  controllerAccount: z
    .string()
    .describe(
      "The address of the controller account on the respective network, which is authorized to manage staking operations, including nominating validators.",
    ),
  targets: z
    .array(z.string().describe("An address of a validator to nominate."))
    .min(1, "At least one validator must be nominated.")
    .describe(
      "An array of addresses of the validators you wish to nominate on the respective network. The maximum count depends on the network (e.g., 16 for Polkadot, 24 for Kusama). (Type: Vec<MultiAddress> / Vec<AccountIdLookupOf>)",
    ),
  tokenSymbol: z
    .enum(["DOT", "KSM", "WND", "PAS"])
    .default("DOT")
    .describe(
      "The token symbol of the network you are nominating on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
    ),
});

type NominateAgentInput = z.infer<typeof _nominateAgentInputSchema>;

export const nominateAgent = tool({
  name: "nominateAgent",
  description:
    "Nominate a list of validators to stake tokens with on a network within the Polkadot ecosystem. IMPORTANT: Staking locations - All networks (Polkadot, Kusama, Westend, Paseo): Use their respective AssetHub chains (Polkadot AssetHub, Kusama AssetHub, Westend AssetHub, Paseo AssetHub) as staking has migrated there. This action registers your intention to stake with specific validators and is essential for earning staking rewards. The maximum number of nominators varies by network.",
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    network: z.string().describe("The name of active network/chain."),
    controllerAccount: z
      .string()
      .describe(
        "The address of the controller account on the respective network, which is authorized to manage staking operations, including nominating validators.",
      ),
    targets: z
      .array(z.string().describe("An address of a validator to nominate."))
      .min(1, "At least one validator must be nominated.")
      .describe(
        "An array of addresses of the validators you wish to nominate on the respective network. The maximum count depends on the network (e.g., 16 for Polkadot, 24 for Kusama). (Type: Vec<MultiAddress> / Vec<AccountIdLookupOf>)",
      ),
    tokenSymbol: z
      .enum(["DOT", "KSM", "WND", "PAS"])
      .default("DOT")
      .describe(
        "The token symbol of the network you are nominating on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
      ),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  outputSchema: z.object({
    tx: z
      .object({
        targets: z.array(z.string()),
      })
      .optional(),
    message: z.string(),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input: NominateAgentInput) => {
    const { controllerAccount, targets, tokenSymbol, network } = input;
    const symbol = tokenSymbol;
    const relayChain = SYMBOL_TO_RELAY_CHAIN[symbol];
    const maxValidators = MAX_NOMINATIONS[symbol] || 16;
    const normalizedNetwork = network.trim().toLowerCase();

    if (!controllerAccount) {
      return {
        message: "Please provide a controller account address.",
      };
    }

    if (!isValidSS58Address(controllerAccount)) {
      return {
        message:
          "The provided controller account address is not valid SS58 address.",
      };
    }

    if (targets.length === 0) {
      return {
        message: "Please provide at least one validator to nominate.",
      };
    }

    if (targets.length > maxValidators) {
      return {
        message: `You can nominate a maximum of ${maxValidators.toFixed(0)} validators on ${network}.`,
      };
    }

    // Check if user is on the correct chain for staking
    // All chains (including Polkadot): staking has migrated to AssetHub
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
        message: `This operation is not possible on ${network}. Nominating validators for ${symbol} is only available on ${relayChain} AssetHub. Please switch to ${relayChain} AssetHub to perform this operation.`,
      };
    }

    return {
      tx: {
        targets,
      },
      message: `
      controllerAccount: ${controllerAccount}
      targets: ${targets.join(", ")}
      An nomination request for ${targets.length.toFixed(0)} validators on ${network} has been prepared. Please sign and submit the transaction to nominate the validators.`,
    };
  },
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unbondAgentInputSchema = z.object({
  controllerAccount: z
    .string()
    .describe(
      "The address of the controller account on the respective network, which is authorized to manage staking operations for the bonded funds.",
    ),
  network: z.string().describe("The name of the active network/chain."),
  value: z
    .number()
    .describe(
      "The amount of tokens to unbond (e.g., '5', '50'). The token symbol should be provided separately in 'tokenSymbol'. This amount will enter a 'waiting period' before it can be redeemed. (Type: Compact<u128> / BalanceOf)",
    ),
  tokenSymbol: z
    .enum(["DOT", "KSM", "WND", "PAS"])
    .default("DOT")
    .describe(
      "The token symbol of the network you are unbonding from (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
    ),
});

type UnbondAgentInput = z.infer<typeof _unbondAgentInputSchema>;

export const unbondAgent = tool({
  name: "unbondAgent",
  description:
    "Unbond a specific amount of tokens that were previously bonded for staking on a network within the Polkadot ecosystem. IMPORTANT: Staking locations - All networks (Polkadot, Kusama, Westend, Paseo): Use their respective AssetHub chains (Polkadot AssetHub, Kusama AssetHub, Westend AssetHub, Paseo AssetHub) as staking has migrated there. These funds will become available for withdrawal after a network-specific unbonding period.",
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    controllerAccount: z
      .string()
      .describe(
        "The address of the controller account on the respective network, which is authorized to manage staking operations for the bonded funds.",
      ),
    network: z.string().describe("The name of the active network/chain."),
    value: z
      .number()
      .describe(
        "The amount of tokens to unbond (e.g., '5', '50'). The token symbol should be provided separately in 'tokenSymbol'. This amount will enter a 'waiting period' before it can be redeemed. (Type: Compact<u128> / BalanceOf)",
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
        value: z.number(),
      })
      .optional(),
    message: z.string(),
  }),
  // @ts-ignore - tool function overload issue with inline schemas (TypeScript shows error but ESLint parser doesn't)
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async (input: UnbondAgentInput) => {
    const { controllerAccount, value, tokenSymbol, network } = input;
    const symbol = tokenSymbol;
    const relayChain = SYMBOL_TO_RELAY_CHAIN[symbol];
    const unbondingDays = UNBONDING_PERIOD_DAYS_MAP[symbol] || 28;
    const normalizedNetwork = network.trim().toLowerCase();

    if (value <= 0) {
      return {
        message: "Please provide a positive numeric value for unbonding.",
      };
    }

    if (!controllerAccount) {
      return {
        message: "Please provide a controller account address.",
      };
    }

    if (!isValidSS58Address(controllerAccount)) {
      return {
        message: `The provided address is not valid SS58 address. ${controllerAccount}`,
      };
    }

    // Check if user is on the correct chain for staking
    // All chains (including Polkadot): staking has migrated to AssetHub
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
        message: `This operation is not possible on ${network}. Unbonding tokens for ${symbol} is only available on ${relayChain} AssetHub. Please switch to ${relayChain} AssetHub to perform this operation.`,
      };
    }

    return {
      tx: {
        value,
      },
      message: `
      controllerAccount: ${controllerAccount}
      An unbonding request for ${value.toFixed(2)} ${symbol} on ${network} has been prepared. The tokens will become available after an unbonding period of ${unbondingDays.toFixed(0)} days. Please sign and submit the transaction to unbond tokens.
      `,
    };
  },
});

export const getBondedAmountAgent = tool({
  name: "getBondedAmountAgent",
  description:
    "Get the current bonded staking amount for a controller account on the active network. This returns the stash account, total bonded amount, and active bonded amount. IMPORTANT: Staking locations - All networks (Polkadot, Kusama, Westend, Paseo): Use their respective AssetHub chains (Polkadot AssetHub, Kusama AssetHub, Westend AssetHub, Paseo AssetHub) as staking has migrated there.",
  // @ts-ignore - tool function overload issue (TypeScript shows error but ESLint parser doesn't)
  inputSchema: z.object({
    controllerAccount: z
      .string()
      .describe("The controller account address to query bonded amount for."),
    network: z.string().describe("The name of the active network/chain."),
    tokenSymbol: z
      .enum(["DOT", "KSM", "WND", "PAS"])
      .optional()
      .default("DOT")
      .describe(
        "The token symbol of the network (e.g., 'DOT', 'KSM', 'WND', 'PAS').",
      ),
  }),
});
