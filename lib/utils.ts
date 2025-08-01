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
  return (BigInt(amount) * 10n ** BigInt(decimals)).toString();
}
