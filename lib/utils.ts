import { chainConfig } from "@/papi-config";
import { hexToU8a, isHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { clsx, type ClassValue } from "clsx";
import { customAlphabet } from "nanoid";
import { twMerge } from "tailwind-merge";

export interface FormatCurrencyOptions {
  nDecimals: number;
  padToDecimals: boolean;
  decimalSeparator: string;
}

const defaultOptions: FormatCurrencyOptions = {
  nDecimals: Infinity,
  padToDecimals: true,
  decimalSeparator: ".",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function trimAddress(address: string, length?: number) {
  length ??= 4;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

export const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789");

export const formatBalance = ({
  value,
  decimals,
  unit,
  options,
}: {
  value: bigint | null | undefined;
  decimals: number;
  unit?: string;
  options?: Partial<FormatCurrencyOptions>;
}): string => {
  const { nDecimals } = {
    ...defaultOptions,
    ...options,
  };
  if (value === null || value === undefined) return "";

  const precisionMultiplier = 10n ** BigInt(decimals);
  const isNegative = value < 0n;
  const absValue = isNegative ? value * -1n : value;

  const fullNumber = Number(absValue) / Number(precisionMultiplier);

  const formattedNumber = fullNumber.toFixed(
    nDecimals === Infinity ? decimals : nDecimals,
  );

  const finalNumber = isNegative ? `-${formattedNumber}` : formattedNumber;

  return unit ? `${finalNumber} ${unit}` : finalNumber;
};

export function isValidSS58Address(address: string): boolean {
  try {
    const decoded = isHex(address) ? hexToU8a(address) : decodeAddress(address);

    return decoded.length === 32;
  } catch {
    return false;
  }
}

export function convertAmountToPlancks(
  amount: number,
  decimals: number,
): string {
  const multiplier = 10 ** decimals;
  const plancks = Math.round(amount * multiplier);
  return BigInt(plancks).toString();
}

export function sanitizeText(text: string) {
  return text.replace("<has_function_call>", "");
}

export function isValidEthereumAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function getSubscanSubdomain(chain: string): string {
  const normalizedChain = chain.trim();

  // Handle AssetHub chains - format: "assethub-{relay}"
  if (normalizedChain.includes("AssetHub")) {
    const relays = ["Polkadot", "Westend", "Paseo", "Kusama"];
    for (const relay of relays) {
      if (normalizedChain.includes(relay)) {
        return `assethub-${relay.toLowerCase()}`;
      }
    }
  }

  // Handle regular relay chains
  const relays = ["Polkadot", "Westend", "Paseo", "Kusama"];
  for (const relay of relays) {
    if (normalizedChain.endsWith(relay)) {
      if (normalizedChain === relay) {
        return relay.toLowerCase();
      }
      const prefix = normalizedChain.substring(
        0,
        normalizedChain.length - relay.length,
      );
      // Replace spaces with hyphens in prefix
      const cleanPrefix = prefix.trim().replace(/\s+/g, "-").replace(/-+$/, "");
      return `${cleanPrefix.toLowerCase()}-${relay.toLowerCase()}`;
    }
  }

  // Fallback: replace spaces with hyphens
  return normalizedChain.replace(/\s+/g, "-").toLowerCase();
}

/**
 * Converts an SS58 address to the format required by the target chain.
 * Different chains use different SS58 prefixes:
 * - Polkadot: prefix 0 (addresses start with "1")
 * - Paseo: prefix 0 (addresses start with "1")
 * - Westend: prefix 42 (addresses start with "5")
 * - AssetHub chains: same as their relay chain
 */
export function convertAddressToChainFormat(
  address: string,
  targetChainName: string,
): string {
  try {
    // Decode the address to get the raw bytes
    const decoded = decodeAddress(address);

    // Find the target chain config
    const targetChain = chainConfig.find(
      (chain) => chain.name.toLowerCase() === targetChainName.toLowerCase(),
    );

    if (!targetChain) {
      // If chain not found, return original address
      return address;
    }

    // Get SS58 prefix from chain spec
    // Polkadot and Paseo use prefix 0, Westend uses prefix 42
    let ss58Prefix: number;
    if (
      targetChain.name === "Polkadot" ||
      targetChain.name === "Polkadot AssetHub" ||
      targetChain.name === "Paseo" ||
      targetChain.name === "Paseo AssetHub"
    ) {
      ss58Prefix = 0;
    } else if (
      targetChain.name === "Westend" ||
      targetChain.name === "Westend AssetHub"
    ) {
      ss58Prefix = 42;
    } else {
      // Default to Polkadot prefix if unknown
      ss58Prefix = 0;
    }

    // Encode with the target chain's prefix
    return encodeAddress(decoded, ss58Prefix);
  } catch {
    // If conversion fails, return original address
    return address;
  }
}
