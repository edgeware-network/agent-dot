export const CHAINS = {
  DOT: {
    Polkadot: "Polkadot",
    "Polkadot Assethub": "AssetHubPolkadot",
    Acala: "Acala",
    Ajuna: "Ajuna",
    Astar: "Astar",
    Bifrost: "BifrostPolkadot",
    "Polkadot BridgeHub": "BridgeHubPolkadot",
    Centrifuge: "Centrifuge",
    ComposableFinance: "ComposableFinance",
    Darwinia: "Darwinia",
    Hydration: "Hydration",
    Interlay: "Interlay",
    Heima: "Heima",
    Jamton: "Jamton",
    Moonbeam: "Moonbeam",
    "Polkadot Coretime": "CoretimePolkadot",
    Laos: "Laos",
    Robonomics: "RobonomicsPolkadot",
    "Polkadot People": "PeoplePolkadot",
    Unique: "Unique",
    Crust: "Crust",
    Manta: "Manta",
    Nodle: "Nodle",
    NeuroWeb: "NeuroWeb",
    Pendulum: "Pendulum",
    Zeitgeist: "Zeitgeist",
    "Polkadot Collectives": "Collectives",
    Phala: "Phala",
    Subsocial: "Subsocial",
    KiltSpiritnet: "KiltSpiritnet",
    Curio: "Curio",
    Mythos: "Mythos",
    Peaq: "Peaq",
    Polimec: "Polimec",
  },
  WND: {
    Westend: "Westend",
    "Westend AssetHub": "AssetHubWestend",
    "Westend BridgeHub": "BridgeHubWestend",
    "Westend Collectives": "CollectivesWestend",
    "Westend Coretime": "CoretimeWestend",
    "Westend People": "PeopleWestend",
    Penpal: "Penpal",
  },
  PAS: {
    Paseo: "Paseo",
    "Paseo AssetHub": "AssetHubPaseo",
    "Paseo BridgeHub": "BridgeHubPaseo",
    "Paseo Coretime": "CoretimePaseo",
    PAssetHub: "PAssetHub",
    "Paseo People": "PeoplePaseo",
    Ajuna: "AjunaPaseo",
    Bifrost: "BifrostPaseo",
    Heima: "HeimaPaseo",
    Hydration: "HydrationPaseo",
    Kilt: "KiltPaseo",
    Laos: "LaosPaseo",
    NeuroWeb: "NeuroWebPaseo",
    Nodle: "NodlePaseo",
    Zeitgeist: "ZeitgeistPaseo",
  },
} as {
  DOT: Record<string, string>;
  WND: Record<string, string>;
  PAS: Record<string, string>;
};

export const WND_TELEPORT_ROUTES = {
  "Westend AssetHub": [
    "Westend",
    "Westend BridgeHub",
    "Westend Collectives",
    "Westend Coretime",
    "Westend People",
  ],
  Westend: [
    "Westend AssetHub",
    "Westend BridgeHub",
    "Westend Collectives",
    "Westend Coretime",
    "Westend People",
  ],
  "Westend BridgeHub": ["Westend", "Westend AssetHub"],
  "Westend Collectives": ["Westend", "Westend AssetHub"],
  "Westend Coretime": ["Westend", "Westend AssetHub"],
  "Westend People": ["Westend", "Westend AssetHub"],
};

export const PAS_TELEPORT_ROUTES = {
  "Paseo AssetHub": ["Paseo", "Paseo BridgeHub"],
  Paseo: [
    "Paseo AssetHub",
    "Paseo BridgeHub",
    "PAssetHub",
    "Paseo Coretime",
    "Paseo People",
  ],
  "Paseo BridgeHub": ["Paseo", "Paseo AssetHub"],
  "Paseo Coretime": ["Paseo"],
  "Paseo People": ["Paseo"],
  // PAssetHub can only teleport to Paseo relay chain, not to Paseo AssetHub (temporarily disabled path)
  PAssetHub: ["Paseo"],
};

export const DOT_TELEPORT_ROUTES = {
  "Polkadot Assethub": [
    "Polkadot",
    "Polkadot BridgeHub",
    "Polkadot Collectives",
    "Polkadot Coretime",
    "Polkadot People",
  ],
  Polkadot: [
    "Polkadot Assethub",
    "Polkadot BridgeHub",
    "Polkadot Collectives",
    "Polkadot Coretime",
    "Polkadot People",
  ],
  "Polkadot BridgeHub": ["Polkadot", "Polkadot Assethub"],
  "Polkadot Collectives": ["Polkadot", "Polkadot Assethub"],
  "Polkadot Coretime": ["Polkadot", "Polkadot Assethub"],
  "Polkadot People": ["Polkadot", "Polkadot Assethub"],
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
