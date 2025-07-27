import { formatBalance } from "@/lib/utils";
import { AvailableApis, ChainConfig } from "@/papi-config";
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
