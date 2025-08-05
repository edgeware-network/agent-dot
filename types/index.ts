import { AvailableApis, ChainConfig } from "@/papi-config";
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

export interface Transaction {
  to: string;
  amount: number;
}
