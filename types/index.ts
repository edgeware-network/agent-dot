import { AvailableApis, ChainConfig } from "@/papi-config";
import { TNodeDotKsmWithRelayChains } from "@paraspell/sdk";
import { PolkadotClient } from "polkadot-api";
import {
  InjectedExtension,
  InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import { RefObject } from "react";

export type ApiRef = RefObject<AvailableApis | null>;
export type ActiveChainRef = RefObject<ChainConfig>;
export type SelectedAccountRef = RefObject<
  | (InjectedPolkadotAccount & {
      extension: InjectedExtension;
    })
  | null
>;
export type ConnectedAccountsRef = RefObject<InjectedPolkadotAccount[]>;
export type SelectedExtensionsRef = RefObject<InjectedExtension[]>;
export type SetActiveChainRef = RefObject<
  (chain: ChainConfig) => Promise<void>
>;
export type SetSelectedAccountRef = RefObject<
  (account: InjectedPolkadotAccount, extension: InjectedExtension) => void
>;
export type ChainConfigRef = RefObject<ChainConfig[]>;
export type ClientRef = RefObject<PolkadotClient | null>;

export interface Transaction {
  to: string;
  amount: number;
}

export interface XcmTransaction {
  src: TNodeDotKsmWithRelayChains;
  dst: TNodeDotKsmWithRelayChains;
  amount: number;
  sender: string;
  symbol: string;
}

export interface Bond {
  value: number;
  payee: "Staked" | "Stash" | "Controller" | "Account" | "None";
  rewardAccount?: string;
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
