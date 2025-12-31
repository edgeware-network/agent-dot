import {
  CHAINS,
  DOT_TELEPORT_ROUTES,
  PAS_TELEPORT_ROUTES,
  WND_TELEPORT_ROUTES,
} from "@/constants/chains";
import { getSupportedAssets, TSubstrateChain } from "@paraspell/sdk";

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

  return CHAINS[symbol][matchedKey] as TSubstrateChain;
}

export function isAssetSupported({
  symbol,
  src,
  dst,
}: {
  symbol: string;
  src: TSubstrateChain;
  dst: TSubstrateChain;
}) {
  const assets = getSupportedAssets(src, dst);

  if (assets.length === 0) return false;

  const supportedAssets = assets.map((asset) => asset.symbol);

  return supportedAssets.includes(symbol);
}

export function isValidTeleportRoute(
  src: string,
  dst: string,
  symbol: "DOT" | "WND" | "PAS",
): boolean {
  const teleportRoutes =
    symbol === "DOT"
      ? DOT_TELEPORT_ROUTES
      : symbol === "WND"
        ? WND_TELEPORT_ROUTES
        : PAS_TELEPORT_ROUTES;

  const srcKey = Object.keys(teleportRoutes).find(
    (key) => key.toLowerCase() === src.toLowerCase(),
  );

  if (!srcKey) return false;

  const validDestinations = teleportRoutes[
    srcKey as keyof typeof teleportRoutes
  ] as string[];
  const dstKey = Object.keys(teleportRoutes).find(
    (key) => key.toLowerCase() === dst.toLowerCase(),
  );

  if (!dstKey) return false;

  return validDestinations.includes(dstKey);
}
