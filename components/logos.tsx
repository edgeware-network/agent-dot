"use client";
import Image from "next/image";

export const logos = {
  polkadot: (
    <Image
      src="/icons/polkadot.svg"
      alt="Polkadot"
      width={32}
      height={32}
      priority
    />
  ),
  paseo: (
    <Image src="/icons/paseo.png" alt="Paseo" width={32} height={32} priority />
  ),
  westend: (
    <Image src="/icons/westend.svg" alt="Westend" width={32} height={32} />
  ),
  polkadot_asset_hub: (
    <Image
      src="/icons/polkadot-asset-hub.svg"
      alt="Polkadot Asset Hub"
      width={32}
      height={32}
      priority
    />
  ),
  paseo_asset_hub: (
    <Image
      src="/icons/paseo-asset-hub.svg"
      alt="Paseo Asset Hub"
      width={32}
      height={32}
      priority
    />
  ),
  westend_asset_hub: (
    <Image
      src="/icons/westend-asset-hub.svg"
      alt="Westend Asset Hub"
      width={32}
      height={32}
      priority
    />
  ),
};
