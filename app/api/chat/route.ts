import { prompt } from "@/agents/prompt";
import {
  bondAgent,
  bondExtraAgent,
  bondExtraNominationPoolsAgent,
  getActiveAccount,
  getActiveNameAndBalance,
  getActiveNetwork,
  getAvailableNetworks,
  getAvailableValidators,
  getBalances,
  getBondedAmountAgent,
  getConnectedAccounts,
  getTeleportRoutes,
  joinNominationPoolsAgent,
  nominateAgent,
  setActiveAccount,
  setActiveNetwork,
  transferAgent,
  unbondAgent,
  unbondFromNominationPoolsAgent,
  xcmAgent,
  xcmStablecoinFromAssetHub,
} from "@/agents/tools";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  ToolSet,
  UIMessage,
} from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const tools: ToolSet = {
  getBalances: getBalances,
  getActiveNameAndBalance: getActiveNameAndBalance,
  getConnectedAccounts: getConnectedAccounts,
  getActiveAccount: getActiveAccount,
  setActiveAccount: setActiveAccount,
  getAvailableNetworks: getAvailableNetworks,
  getActiveNetwork: getActiveNetwork,
  setActiveNetwork: setActiveNetwork,
  transferAgent: transferAgent,
  getAvailableValidators: getAvailableValidators,
  xcmAgent: xcmAgent,
  xcmStablecoinFromAssetHub: xcmStablecoinFromAssetHub,
  bondAgent: bondAgent,
  bondExtraAgent: bondExtraAgent,
  getBondedAmountAgent: getBondedAmountAgent,
  nominateAgent: nominateAgent,
  unbondAgent: unbondAgent,
  joinNominationPoolsAgent: joinNominationPoolsAgent,
  bondExtraNominationPoolsAgent: bondExtraNominationPoolsAgent,
  unbondFromNominationPoolsAgent: unbondFromNominationPoolsAgent,
  getTeleportRoutes: getTeleportRoutes,
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages: UIMessage[] };
    const { messages } = body;

    // Validate messages array
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({
          error: "Invalid request: messages must be an array",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Use messages directly (already validated by type assertion)
    const validMessages = messages;

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid request: no valid messages found",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system:
        "You are AgentDot, a friendly and expert AI assistant for the polkadot ecosystem.",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        ...convertToModelMessages(validMessages),
      ],
      stopWhen: stepCountIs(3),
      tools,
      abortSignal: req.signal,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Chat API error:", error);

    // Return a proper error response
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
