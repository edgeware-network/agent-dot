import { formatBalance } from "@/lib/utils";
import { AvailableApis, ChainConfig } from "@/papi-config";
import { ActiveChainRef, ClientRef } from "@/types";
import { dot, pas, wnd } from "@polkadot-api/descriptors";
import { SS58String } from "polkadot-api";
import { InjectedExtension } from "polkadot-api/pjs-signer";
import { RefObject } from "react";

export async function getAccountBalance(
  address: string,
  api: RefObject<AvailableApis | null>,
  chainConfig: RefObject<ChainConfig>,
) {
  const balances = await api.current?.query.System.Account.getValue(address);
  const unit = chainConfig.current.chainSpec.properties.tokenSymbol;
  const decimals = chainConfig.current.chainSpec.properties.tokenDecimals;

  return formatBalance({
    value:
      balances?.data.free ??
      0n - (balances?.data.reserved ?? 0n) - (balances?.data.frozen ?? 0n),
    unit,
    decimals,
    options: { nDecimals: 3 },
  });
}

export function matchInjectedAccount(
  account: {
    address: SS58String | undefined;
    name: string;
  },
  selectedExtensions: RefObject<InjectedExtension[]>,
) {
  const accounts = selectedExtensions.current.flatMap((extension) =>
    extension.getAccounts().map((account) => ({
      ext: extension,
      acc: account,
    })),
  );

  return accounts.find(
    (acc) =>
      acc.acc.address === account.address ||
      acc.acc.name?.toLowerCase() === account.name.toLowerCase(),
  );
}

export type StakingDescriptors = typeof dot | typeof pas | typeof wnd;

export async function getSessionValidators({
  client,
  activeChain,
}: {
  client: ClientRef;
  activeChain: ActiveChainRef;
}) {
  if (!client.current) return [];
  const bestValidators: {
    address: SS58String;
    staked: bigint;
  }[] = [];

  const descriptors = activeChain.current.descriptors as StakingDescriptors;
  const api = client.current.getTypedApi(descriptors);

  const validators = await api.query.Session.Validators.getValue();
  const activeEra = await api.query.Staking.ActiveEra.getValue();

  if (activeEra) {
    for (const val of validators) {
      const exposure = await api.query.Staking.ErasStakersOverview.getValue(
        activeEra.index,
        val,
      );

      if (exposure) {
        bestValidators.push({
          address: val,
          staked: exposure.total,
        });
      }
    }

    const sorted = bestValidators.sort((a, b) => Number(b.staked - a.staked));

    if (sorted.length > 10) {
      return sorted.slice(0, 10);
    }
  }

  return [];
}
