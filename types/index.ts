import { AvailableApis, ChainConfig } from "@/papi-config";
import type { WalletAccount } from "@/providers/wallet-provider";
import { TSubstrateChain } from "@paraspell/sdk";
import type { Wallet } from "@reactive-dot/core/wallets.js";
import { PolkadotClient } from "polkadot-api";
import { RefObject } from "react";

export type ApiRef = RefObject<AvailableApis | null>;
export type ActiveChainRef = RefObject<ChainConfig>;
export type SelectedAccountRef = RefObject<WalletAccount | null>;
export type ConnectedAccountsRef = RefObject<WalletAccount[]>;
export type SelectedExtensionsRef = RefObject<Wallet[]>;
export type SetActiveChainRef = RefObject<
  (chain: ChainConfig) => Promise<void>
>;
export type SetSelectedAccountRef = RefObject<(account: WalletAccount) => void>;
export type ChainConfigRef = RefObject<ChainConfig[]>;
export type ClientRef = RefObject<PolkadotClient | null>;
export type ActiveRpcChainRef = RefObject<ChainConfig>;
export type SetActiveRpcChainRef = RefObject<(chain: ChainConfig) => void>;
export type AssetHubClientRef = RefObject<PolkadotClient | null>;

export interface Transaction {
  to: string;
  amount: number;
}

export interface XcmTransaction {
  src: TSubstrateChain;
  dst: TSubstrateChain;
  amount: number;
  sender: string;
  symbol: string;
}

export interface XcmStablecoinTransaction {
  src: TSubstrateChain;
  dst: TSubstrateChain;
  amount: number;
  symbol: "USDT" | "USDC";
  id: number;
  recipient: string;
}

export interface Bond {
  value: number;
  payee: "Staked" | "Stash" | "Controller" | "Account" | "None";
  rewardAccount?: string;
}

export interface BondExtra {
  maxAdditional: number;
}

export interface Nominate {
  targets: string[];
}

export interface Unbond {
  value: number;
}

export interface JoinNominationPool {
  poolId: number;
  amount: number;
}

export interface BondExtraNominationPool {
  type: "FreeBalance" | "Rewards";
  amount: number | undefined;
}

export interface UnbondFromNominationPool {
  memberAddress: string;
  unbondingPoints: number;
}
