import { tool } from "ai";
import z from "zod";

const getAvailableSystemChains = tool({
  name: "getAvailableSystemChains",
  description:
    "Get the list of available system chains/networks for cross-chain transfers.",
  inputSchema: z.object({}),
});

const getAvailableRelayChains = tool({
  name: "getAvailableRelayChains",
  description:
    "Get the list of available relay chains/networks for cross-chain transfers.",
  inputSchema: z.object({}),
});

export { getAvailableRelayChains, getAvailableSystemChains };
