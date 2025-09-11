export const CHAINS = {
  DOT: {
    Polkadot: "Polkadot",
    "Polkadot Assethub": "AssetHubPolkadot",
    "Polkadot BridgeHub": "BridgeHubPolkadot",
    "Polkadot Coretime": "CoretimePolkadot",
    "Polkadot People": "PeoplePolkadot",
    "Polkadot Collectives": "Collectives",
  },
  WND: {
    Westend: "Westend",
    "Westend AssetHub": "AssetHubWestend",
    "Westend BridgeHub": "BridgeHubWestend",
    "Westend Collectives": "CollectivesWestend",
    "Westend Coretime": "CoretimeWestend",
    "Westend People": "PeopleWestend",
  },
  PAS: {
    Paseo: "Paseo",
    "Paseo AssetHub": "AssetHubPaseo",
    "Paseo BridgeHub": "BridgeHubPaseo",
    "Paseo Coretime": "CoretimePaseo",
    PAssetHub: "PAssetHub",
    "Paseo People": "PeoplePaseo",
  },
  USDT: {
    Hydration: "Hydration",
    Moonbeam: "Moonbeam",
  },
  USDC: {
    Hydration: "Hydration",
    Moonbeam: "Moonbeam",
  },
} as {
  DOT: Record<string, string>;
  WND: Record<string, string>;
  PAS: Record<string, string>;
  USDT: Record<string, string>;
  USDC: Record<string, string>;
};

export const teleportRulesByToken: Record<string, string[]> = {
  polkadot: [
    "Polkadot AssetHub",
    "Polkadot BridgeHub",
    "Polkadot Collectives",
    "Polkadot Coretime",
    "Polkadot People",
  ],
  "polkadot assethub": [
    "Polkadot",
    "Polkadot BridgeHub",
    "Polkadot Collectives",
    "Polkadot Coretime",
    "Polkadot People",
  ],
  "polkadot bridgehub": ["Polkadot", "Polkadot AssetHub"],
  "polkadot collectives": ["Polkadot", "Polkadot AssetHub"],
  "polkadot coretime": ["Polkadot", "Polkadot AssetHub"],
  "polkadot people": ["Polkadot", "Polkadot AssetHub"],
  westend: [
    "Westend Assethub",
    "Westend Bridgehub",
    "Westend Collectives",
    "Westend Coretime",
    "Westend People",
  ],
  "westend assethub": [
    "Westend",
    "Westend Bridgehub",
    "Westend Collectives",
    "Westend Coretime",
    "Westend People",
  ],
  "westend bridgeHub": ["Westend", "Westend AssetHub"],
  "westend collectives": ["Westend", "Westend AssetHub"],
  "westend coretime": ["Westend", "Westend AssetHub"],
  "westend people": ["Westend", "Westend AssetHub"],
  paseo: [
    "Paseo AssetHub",
    "Paseo BridgeHub",
    "PAssetHub",
    "Paseo People",
    "Paseo Coretime",
  ],
  "paseo assethub": ["Paseo", "Paseo BridgeHub", "PAssetHub"],
  "paseo bridgehub": ["Paseo", "Paseo AssetHub"],
  passethub: ["Paseo", "Paseo AssetHub"],
  "Paseo People": ["Paseo"],
  "Paseo Coretime": ["Paseo"],
};

export const TOKENS = {
  DOT: "DOT",
  KSM: "KSM",
  WND: "WND",
  PAS: "PAS",
  USDT: "USDT",
  USDC: "USDC",
} as const;

export const TOKEN_DECIMALS: Record<string, number> = {
  DOT: 10,
  KSM: 12,
  WND: 12,
  PAS: 10,
  USDT: 6,
  USDC: 6,
};

export const MAX_NOMINATIONS: Record<string, number> = {
  DOT: 16,
  KSM: 24,
  WND: 16,
  PAS: 16,
};

export const UNBONDING_PERIOD_DAYS_MAP: Record<string, number> = {
  DOT: 28,
  KSM: 7,
  WND: 7,
  PAS: 28,
};

export const MIN_POOL_BOND_AMOUNT: Record<string, number> = {
  DOT: 1,
  KSM: 0.001,
  WND: 0.001,
  PAS: 1,
};

export const SYMBOL_TO_RELAY_CHAIN = {
  DOT: "Polkadot",
  WND: "Westend",
  PAS: "Paseo",
  KSM: "Kusama",
} as const;

export const RELAY_CHAINS = ["Polkadot", "Westend", "Paseo"] as const;

export type Chains = typeof CHAINS;
export type Symbol = keyof Chains;
export type Parachains = Chains[Symbol];
