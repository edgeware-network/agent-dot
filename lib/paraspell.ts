import { CHAINS } from "@/constants/chains";
import { getSupportedAssets, TNodeDotKsmWithRelayChains } from "@paraspell/sdk";

export function getNodeName({
  name,
  symbol,
}: {
  name: string;
  symbol: "DOT" | "WND" | "PAS";
}) {
  const parachains = CHAINS[symbol];

  const keys = Object.keys(parachains);

  const matchedKey = keys.find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );

  if (!matchedKey) return undefined;

  return CHAINS[symbol][matchedKey] as TNodeDotKsmWithRelayChains;
}

export function isAssetSupported({
  symbol,
  src,
  dst,
}: {
  symbol: string;
  src: TNodeDotKsmWithRelayChains;
  dst: TNodeDotKsmWithRelayChains;
}) {
  const assets = getSupportedAssets(src, dst);

  if (assets.length === 0) return false;

  const supportedAssets = assets.map((asset) => asset.symbol);

  return supportedAssets.includes(symbol);
}
