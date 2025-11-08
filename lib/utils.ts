import { hexToU8a, isHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
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
  const relays = ["Polkadot", "Westend", "Paseo", "Kusama"];
  for (const relay of relays) {
    if (chain.endsWith(relay)) {
      if (chain === relay) {
        return relay.toLowerCase();
      }
      const prefix = chain.substring(0, chain.length - relay.length);
      return `${prefix.toLowerCase()}-${relay.toLowerCase()}`;
    }
  }
  return chain.toLowerCase();
}
