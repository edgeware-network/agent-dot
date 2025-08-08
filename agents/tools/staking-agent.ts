import {
  MAX_NOMINATIONS,
  SYMBOL_TO_RELAY_CHAIN,
  UNBONDING_PERIOD_DAYS_MAP,
} from "@/constants/chains";
import { isValidSS58Address } from "@/lib/utils";
import { tool } from "ai";
import z from "zod";

export const bondAgent = tool({
  name: "bondAgent",
  description:
    "Bond tokens for staking on a Proof-of-Stake network within the Polkadot ecosystem (e.g., Polkadot, Kusama, Westend, Paseo). This locks a specified amount of tokens from a stash account and sets a controller account to manage staking operations, as well as defining how staking rewards will be received.",
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
    value: z
      .number()
      .describe(
        "The amount of tokens to bond (e.g., '10', '0.5'). The token symbol should be provided separately in 'tokenSymbol'. This amount will be locked and must meet the network's minimum bond requirement. (Type: Compact<u128> / BalanceOf)",
      ),
    tokenSymbol: z
      .enum(["DOT", "KSM", "WND", "PAS"])
      .optional()
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
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({
    stashAccount,
    controllerAccount,
    value,
    tokenSymbol,
    payee,
    rewardAccount,
  }) => {
    const network = SYMBOL_TO_RELAY_CHAIN[tokenSymbol];
    try {
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

export const getAvailableValidators = tool({
  name: "getAvailableValidators",
  description:
    "Get the list of available validators for staking on a network within the Polkadot ecosystem (e.g., Polkadot, Kusama, Westend, Paseo).",
  inputSchema: z.object({}),
});

export const nominateAgent = tool({
  name: "nominateAgent",
  description:
    "Nominate a list of validators to stake tokens with on a network within the Polkadot ecosystem (e.g., Polkadot, Kusama, Westend, Paseo). This action registers your intention to stake with specific validators and is essential for earning staking rewards. The maximum number of nominators varies by network.",
  inputSchema: z.object({
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
      .optional()
      .default("DOT")
      .describe(
        "The token symbol of the network you are nominating on (e.g., 'DOT' for Polkadot, 'KSM' for Kusama). Defaults to 'DOT'.",
      ),
  }),
  outputSchema: z.object({
    tx: z
      .object({
        targets: z.array(z.string()),
      })
      .optional(),
    message: z.string(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ controllerAccount, targets, tokenSymbol }) => {
    const network = SYMBOL_TO_RELAY_CHAIN[tokenSymbol];
    const maxValidators = MAX_NOMINATIONS[tokenSymbol] || 16;

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

export const unbondAgent = tool({
  name: "unbondAgent",
  description:
    "Unbond a specific amount of tokens that were previously bonded for staking on a network within the Polkadot ecosystem (e.g., Polkadot, Kusama, Westend, Paseo). These funds will become available for withdrawal after a network-specific unbonding period.",
  inputSchema: z.object({
    controllerAccount: z
      .string()
      .describe(
        "The address of the controller account on the respective network, which is authorized to manage staking operations for the bonded funds.",
      ),
    value: z
      .number()
      .describe(
        "The amount of tokens to unbond (e.g., '5', '50'). The token symbol should be provided separately in 'tokenSymbol'. This amount will enter a 'waiting period' before it can be redeemed. (Type: Compact<u128> / BalanceOf)",
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
        value: z.number(),
      })
      .optional(),
    message: z.string(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ controllerAccount, value, tokenSymbol }) => {
    const network = SYMBOL_TO_RELAY_CHAIN[tokenSymbol];
    const unbondingDays = UNBONDING_PERIOD_DAYS_MAP[tokenSymbol] || 28;

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

    return {
      tx: {
        value,
      },
      message: `
      controllerAccount: ${controllerAccount}
      An unbonding request for ${value.toFixed(2)} ${tokenSymbol} on ${network} has been prepared. The tokens will become available after an unbonding period of ${unbondingDays.toFixed(0)} days. Please sign and submit the transaction to unbond tokens.
      `,
    };
  },
});
