export const CHAINS = {
  DOT: {
    AssetHub: "AssetHubPolkadot",
    Acala: "Acala",
    Ajuna: "Ajuna",
    Astar: "Astar",
    Bifrost: "BifrostPolkadot",
    BridgeHub: "BridgeHubPolkadot",
    Centrifuge: "Centrifuge",
    ComposableFinance: "ComposableFinance",
    Darwinia: "Darwinia",
    Hydration: "Hydration",
    Interlay: "Interlay",
    Heima: "Heima",
    Jamton: "Jamton",
    Moonbeam: "Moonbeam",
    Coretime: "CoretimePolkadot",
    Laos: "Laos",
    Robonomics: "RobonomicsPolkadot",
    People: "PeoplePolkadot",
    Unique: "Unique",
    Crust: "Crust",
    Manta: "Manta",
    Nodle: "Nodle",
    NeuroWeb: "NeuroWeb",
    Pendulum: "Pendulum",
    Zeitgeist: "Zeitgeist",
    Collectives: "Collectives",
    Phala: "Phala",
    Subsocial: "Subsocial",
    KiltSpiritnet: "KiltSpiritnet",
    Curio: "Curio",
    Mythos: "Mythos",
    Peaq: "Peaq",
    Polimec: "Polimec",
  },
  WND: {
    AssetHub: "AssetHubWestend",
    BridgeHub: "BridgeHubWestend",
    Collectives: "CollectivesWestend",
    Coretime: "CoretimeWestend",
    People: "PeopleWestend",
    Penpal: "Penpal",
  },
  PAS: {
    AssetHub: "AssetHubPaseo",
    BridgeHub: "BridgeHubPaseo",
    Coretime: "CoretimePaseo",
    PAssetHub: "PAssetHub",
    People: "PeoplePaseo",
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
} as const;

export const SYMBOL_TO_RELAY_CHAIN = {
  DOT: "Polkadot",
  WND: "Westend",
  PAS: "Paseo",
} as const;

export const RELAY_CHAINS = ["Polkadot", "Westend", "Paseo"] as const;

export type Chains = typeof CHAINS;
export type Symbol = keyof Chains;
export type Parachains = Chains[Symbol];
