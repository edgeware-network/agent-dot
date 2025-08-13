"use client";

import { logos } from "@/components/logos";
import {
  dot,
  dot_asset_hub,
  pas,
  pas_asset_hub,
  wnd,
  wnd_asset_hub,
} from "@polkadot-api/descriptors";
import type { TypedApi } from "polkadot-api";
import { chainSpec as paseoChainSpec } from "polkadot-api/chains/paseo";
import { chainSpec as paseoAssetHubChainSpec } from "polkadot-api/chains/paseo_asset_hub";
import { chainSpec as polkadotChainSpec } from "polkadot-api/chains/polkadot";
import { chainSpec as polkadotAssetHubChainSpec } from "polkadot-api/chains/polkadot_asset_hub";
import { chainSpec as westend2ChainSpec } from "polkadot-api/chains/westend2";
import { chainSpec as westend2AssetHubChainSpec } from "polkadot-api/chains/westend2_asset_hub";

export interface ChainSpec {
  name: string;
  id: string;
  chainType: string;
  bootNodes: string[];
  telemetryEndpoints: string[];
  protocolId: string;
  properties: {
    tokenDecimals: number;
    tokenSymbol: string;
  };
  relay_chain: string;
  para_id: number;
  codeSubstitutes: Record<string, string>;
  genesis: {
    stateRootHash: string;
  };
}
export interface ChainConfig {
  key: string;
  name: string;
  color: string;
  descriptors:
    | typeof dot
    | typeof pas
    | typeof wnd
    | typeof dot_asset_hub
    | typeof pas_asset_hub
    | typeof wnd_asset_hub;
  endpoints: string[];
  explorerUrl?: string;
  icon?: React.ReactNode;
  chainSpec: ChainSpec;
  relayChainSpec?: ChainSpec;
}

export type AvailableApis =
  | TypedApi<typeof dot>
  | TypedApi<typeof dot_asset_hub>
  | TypedApi<typeof pas>
  | TypedApi<typeof pas_asset_hub>
  | TypedApi<typeof wnd>
  | TypedApi<typeof wnd_asset_hub>;

export const chainConfig: ChainConfig[] = [
  {
    key: "polkadot",
    name: "Polkadot",
    descriptors: dot,
    color: "#E6007A",
    endpoints: [
      "wss://rpc-polkadot.luckyfriday.io",
      "wss://polkadot-rpc.dwellir.com",
      "wss://rpc.ibp.network/polkadot",
    ],
    icon: logos.polkadot,
    chainSpec: JSON.parse(polkadotChainSpec) as ChainSpec,
  },
  {
    key: "paseo",
    name: "Paseo",
    descriptors: pas,
    color: "#38393F",
    endpoints: [
      "wss://rpc.ibp.network/paseo",
      "wss://pas-rpc.stakeworld.io",
      "wss://paseo.rpc.amforc.com",
    ],
    icon: logos.paseo,
    chainSpec: JSON.parse(paseoChainSpec) as ChainSpec,
  },
  {
    key: "westend",
    name: "Westend",
    color: "#DA68A7",
    descriptors: wnd,
    endpoints: [
      "wss://westend-rpc.n.dwellir.com",
      "wss://westend.api.onfinality.io/public-ws",
      "wss://rpc.ibp.network/westend",
    ],
    icon: logos.westend,
    chainSpec: JSON.parse(westend2ChainSpec) as ChainSpec,
  },
  {
    key: "polkadot_asset_hub",
    name: "Polkadot AssetHub",
    descriptors: dot_asset_hub,
    color: "#86E62A",
    endpoints: [
      "wss://rpc-asset-hub-polkadot.luckyfriday.io",
      "wss://asset-hub-polkadot.dotters.network",
      "wss://statemint-rpc-tn.dwellir.com",
    ],
    icon: logos.polkadot_asset_hub,
    chainSpec: JSON.parse(polkadotAssetHubChainSpec) as ChainSpec,
    relayChainSpec: JSON.parse(polkadotChainSpec) as ChainSpec,
  },
  {
    key: "paseo_asset_hub",
    name: "Paseo AssetHub",
    descriptors: pas_asset_hub,
    color: "#77BB77",
    endpoints: [
      "wss://sys.ibp.network/asset-hub-paseo",
      "wss://sys.turboflakes.io/asset-hub-paseo",
      "wss://pas-rpc.stakeworld.io/assethub",
    ],
    icon: logos.paseo_asset_hub,
    chainSpec: JSON.parse(paseoAssetHubChainSpec) as ChainSpec,
    relayChainSpec: JSON.parse(paseoChainSpec) as ChainSpec,
  },
  {
    key: "westend_asset_hub",
    name: "Westend AssetHub",
    color: "#77BB77",
    descriptors: wnd_asset_hub,
    endpoints: [
      "wss://sys.ibp.network/asset-hub-westend",
      "wss://asset-hub-westend-rpc.n.dwellir.com",
      "wss://asset-hub-westend.rpc.permanence.io",
    ],
    icon: logos.westend_asset_hub,
    chainSpec: JSON.parse(westend2AssetHubChainSpec) as ChainSpec,
    relayChainSpec: JSON.parse(westend2ChainSpec) as ChainSpec,
  },
];
