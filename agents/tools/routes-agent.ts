import {
  DOT_TELEPORT_ROUTES,
  PAS_TELEPORT_ROUTES,
  WND_TELEPORT_ROUTES,
} from "@/constants/chains";
import { tool } from "ai";
import { z } from "zod";

const ALL_TELEPORT_ROUTES = {
  ...DOT_TELEPORT_ROUTES,
  ...WND_TELEPORT_ROUTES,
  ...PAS_TELEPORT_ROUTES,
};

export const getTeleportRoutes = tool({
  description:
    "Get the valid teleport destinations for a given origin chain within the Polkadot, Westend, or Paseo ecosystems.",
  // @ts-expect-error - tool function overload issue
  inputSchema: z.object({
    chain: z
      .string()
      .describe(
        "The origin chain to get the teleport destinations for. Must be one of the available chains.",
      ),
  }),
  // @ts-expect-error - tool function overload issue
  execute: ({ chain }: { chain: string }) => {
    const destinations =
      ALL_TELEPORT_ROUTES[chain as keyof typeof ALL_TELEPORT_ROUTES];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!destinations) {
      return {
        error: `Could not find teleport routes for the specified chain: ${chain}. Please ensure the chain name is correct.`,
      };
    }

    return {
      origin: chain,
      destinations: destinations,
    };
  },
});
