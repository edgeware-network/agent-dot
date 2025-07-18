export enum DotWalletPlatform {
  Browser = "browser",
  Android = "Android OS",
  iOS = "iOS",
}

export interface DotWallet {
  id: string;
  name: string;
  platforms: DotWalletPlatform[];
  urls: {
    website: string;
    chromeExtension?: string;
    firefoxExtension?: string;
    androidApp?: string;
    iosApp?: string;
  };
  logoUrls: string[];
}

export const polkadotjs: DotWallet = {
  id: "polkadot-js",
  name: "Polkadot{.js}",
  platforms: [DotWalletPlatform.Browser],
  urls: {
    website: "https://polkadot.js.org/extension/",
    chromeExtension:
      "https://chrome.google.com/webstore/detail/polkadot%7Bjs%7D-extension/mopnmbcafieddcagagdcbnhejhlodfdd",
    firefoxExtension:
      "https://addons.mozilla.org/en-US/firefox/addon/polkadot-js-extension/",
  },
  logoUrls: ["/wallet-logos/polkadot@512w.png"],
};

export const talisman: DotWallet = {
  id: "talisman",
  name: "Talisman",
  platforms: [DotWalletPlatform.Browser],
  urls: {
    website: "https://www.talisman.xyz/",
    chromeExtension:
      "https://chrome.google.com/webstore/detail/talisman-polkadot-wallet/fijngjgcjhjmmpcmkeiomlglpeiijkld",
    firefoxExtension:
      "https://addons.mozilla.org/en-US/firefox/addon/talisman-wallet-extension/",
  },
  logoUrls: ["/wallet-logos/talisman@512w.png"],
};

export const subwallet: DotWallet = {
  id: "subwallet-js",
  name: "SubWallet",
  platforms: [
    DotWalletPlatform.Android,
    DotWalletPlatform.iOS,
    DotWalletPlatform.Browser,
  ],
  urls: {
    website: "https://subwallet.app/",
    chromeExtension:
      "https://chrome.google.com/webstore/detail/subwallet-polkadot-extens/onhogfjeacnfoofkfgppdlbmlmnplgbn",
    firefoxExtension:
      "https://addons.mozilla.org/en-US/firefox/addon/subwallet/",
  },
  logoUrls: ["/wallet-logos/subwallet@512w.png"],
};

export const nova: DotWallet = {
  id: "polkadot-js",
  name: "Nova Wallet",
  platforms: [DotWalletPlatform.Android, DotWalletPlatform.iOS],
  urls: {
    website: "https://novawallet.io/",
    androidApp:
      "https://play.google.com/store/apps/details?id=io.novafoundation.nova.market",
    iosApp:
      "https://apps.apple.com/app/nova-polkadot-kusama-wallet/id1597119355",
  },
  logoUrls: ["/wallet-logos/nova@512w.png"],
};

export const alephzero: DotWallet = {
  id: "aleph-zero",
  name: "Aleph Zero Signer",
  platforms: [DotWalletPlatform.Browser],
  urls: {
    website: "https://alephzero.org/signer",
  },
  logoUrls: ["/wallet-logos/aleph-zero-signer@512w.png"],
};

export const trust: DotWallet = {
  id: "trust",
  name: "Trust Wallet",
  platforms: [
    DotWalletPlatform.Browser,
    DotWalletPlatform.iOS,
    DotWalletPlatform.Android,
  ],
  urls: {
    website: "https://trustwallet.com/download",
  },
  logoUrls: ["/wallet-logos/trust@512w.png"],
};

export const enkrypt: DotWallet = {
  id: "enkrypt",
  name: "Enkrypt",
  platforms: [DotWalletPlatform.Browser],
  urls: {
    website: "https://enkrypt.com/#overview",
  },
  logoUrls: ["/wallet-logos/enkrypt@512w.png"],
};

export const fearlesswallet: DotWallet = {
  id: "fearless-wallet",
  name: "Fearless Wallet",
  platforms: [
    DotWalletPlatform.Browser,
    DotWalletPlatform.iOS,
    DotWalletPlatform.Android,
  ],
  urls: {
    website: "https://fearlesswallet.io/",
  },
  logoUrls: ["/wallet-logos/fearless@512w.png"],
};

export const dotWallets: DotWallet[] = [
  talisman,
  nova,
  subwallet,
  polkadotjs,
  alephzero,
  trust,
  enkrypt,
  fearlesswallet,
];
