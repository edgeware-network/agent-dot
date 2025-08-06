import { CHAINS, Parachains } from "@/constants/chains";
import { getSupportedAssets, TNodeDotKsmWithRelayChains } from "@paraspell/sdk";

export function getNodeName({
  name,
  symbol,
}: {
  name: string;
  symbol: "DOT" | "WND" | "PAS";
}) {
  const matchedKey = Object.keys(CHAINS[symbol]).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );

  if (!matchedKey) return null;

  return CHAINS[symbol][matchedKey as keyof Parachains];
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
