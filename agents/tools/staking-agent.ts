import {
  SYMBOL_TO_RELAY_CHAIN,
  MAX_NOMINATIONS,
  UNBONDING_PERIOD_DAYS_MAP,
  TOKEN_DECIMALS,
} from "@/constants/chains";
import { convertAmountToPlancks } from "@/lib/utils";
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
      .enum(["Staked", "Stash", "Controller", "Account"])
      .describe(
        "Specifies where staking rewards should be sent: 'Staked' (re-bonds rewards), 'Stash' (sends to stash account), 'Controller' (sends to controller account), or 'Account' (sends to a specific address). (Type: PalletStakingRewardDestination)",
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
        stashAccount: z.string(),
        controllerAccount: z.string(),
        value: z.string(),
        tokenSymbol: z.enum(["DOT", "KSM", "WND", "PAS"]),
        payee: z.enum(["Staked", "Stash", "Controller", "Account"]),
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
    const networkName = SYMBOL_TO_RELAY_CHAIN[tokenSymbol];

    if (payee === "Account" && !rewardAccount) {
      return {
        message:
          "❌ Bond operation incomplete: If 'payee' is 'Account', 'rewardAccount' must be provided.",
      };
    }

    let plancksValue: string;
    try {
      plancksValue = convertAmountToPlancks(value, TOKEN_DECIMALS[tokenSymbol]);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "An unknown error occurred.";
      return {
        message: `❌ Invalid value format: ${errorMessage}`,
      };
    }

    let rewardDestinationMessage: string;
    if (payee === "Account" && rewardAccount) {
      rewardDestinationMessage = `Account: \`${rewardAccount}\``;
    } else {
      rewardDestinationMessage = payee;
    }

    return {
      tx: {
        stashAccount,
        controllerAccount,
        value: plancksValue,
        tokenSymbol,
        payee,
        rewardAccount,
      },
      message: `
✅ **Staking Bond prepared for ${networkName}**

**Stash Account:** \`${stashAccount}\`
**Controller Account:** \`${controllerAccount}\`
**Amount to Bond:** \`${String(value)} ${tokenSymbol}\`
**Reward Destination:** \`${rewardDestinationMessage}\`

🔏 _Please sign this transaction using a signer like [Polkadot.js](https://polkadot.js.org) or a wallet like [Talisman](https://talisman.xyz). Funds will be locked for staking._`,
    };
  },
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
        controllerAccount: z.string(),
        targets: z.array(z.string()),
        tokenSymbol: z.enum(["DOT", "KSM", "WND", "PAS"]),
      })
      .optional(),
    message: z.string(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ controllerAccount, targets, tokenSymbol }) => {
    const networkName = SYMBOL_TO_RELAY_CHAIN[tokenSymbol];
    const maxValidators = MAX_NOMINATIONS[tokenSymbol] || 16;

    if (targets.length === 0) {
      return {
        message:
          "❌ Nomination operation incomplete: You must nominate at least one validator.",
      };
    }
    if (targets.length > maxValidators) {
      return {
        message: `❌ Nomination operation incomplete: You can nominate a maximum of ${String(maxValidators)} validators on the ${networkName} network. You provided ${String(targets.length)}.`,
      };
    }

    const validatorList = targets
      .map(
        (address: string, index: number) =>
          `${String(index + 1)}. \`${address}\``,
      )
      .join("\n");

    return {
      tx: {
        controllerAccount,
        targets,
        tokenSymbol,
      },
      message: `
✅ **Nomination prepared**

**Controller Account:** \`${controllerAccount}\`
**Nominated Validators (on ${networkName} network):**
${validatorList}

🔏 _Please sign this transaction using a signer like [Polkadot.js](https://polkadot.js.org) or a wallet like [Talisman](https://talisman.xyz). Your staking preferences on the ${networkName} network will be updated._`,
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
        controllerAccount: z.string(),
        value: z.string(),
        tokenSymbol: z.enum(["DOT", "KSM", "WND", "PAS"]),
      })
      .optional(),
    message: z.string(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ controllerAccount, value, tokenSymbol }) => {
    const networkName = SYMBOL_TO_RELAY_CHAIN[tokenSymbol];
    const unbondingDays = UNBONDING_PERIOD_DAYS_MAP[tokenSymbol] || 28;

    if (value <= 0) {
      return {
        message:
          "❌ Invalid amount: Please provide a positive numeric value to unbond.",
      };
    }

    let plancksValue: string;
    try {
      plancksValue = convertAmountToPlancks(value, TOKEN_DECIMALS[tokenSymbol]);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "An unknown error occurred.";
      return {
        message: `❌ Invalid value format: ${errorMessage}`,
      };
    }

    return {
      tx: {
        controllerAccount,
        value: plancksValue,
        tokenSymbol,
      },
      message: `
✅ **Unbond operation prepared for ${networkName}**

**Controller Account:** \`${controllerAccount}\`
**Amount to Unbond:** \`${String(value)} ${tokenSymbol}\`

🔏 _Please sign this transaction using a signer like [Polkadot.js](https://polkadot.js.org) or a wallet like [Talisman](https://talisman.xyz). Funds will be available for withdrawal after approximately ${String(unbondingDays)} days on ${networkName}._`,
    };
  },
});
