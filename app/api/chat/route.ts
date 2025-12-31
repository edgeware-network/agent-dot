import { prompt } from "@/agents/prompt";
import {
  batchAgent,
  batchAllAgent,
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
  batchAgent: batchAgent,
  batchAllAgent: batchAllAgent,
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

    // Deduplicate messages by id
    const seenMessageIds = new Set<string>();
    const deduplicatedMessages = messages.filter((msg) => {
      if (seenMessageIds.has(msg.id)) {
        return false;
      }
      seenMessageIds.add(msg.id);
      return true;
    });

    // Deduplicate tool calls within assistant messages by toolCallId
    // Also filter out incomplete tool calls (convertToModelMessages doesn't support them)
    const processedMessages = deduplicatedMessages.map((msg) => {
      if (msg.role === "assistant") {
        const seenToolCallIds = new Set<string>();
        const deduplicatedParts = msg.parts.filter((part) => {
          // Check if this part has a toolCallId (it's a tool call)
          if (
            typeof part === "object" &&
            "toolCallId" in part &&
            part.toolCallId
          ) {
            const toolCallId =
              typeof part.toolCallId === "string"
                ? part.toolCallId
                : String(part.toolCallId);

            // Deduplicate: if we've seen this toolCallId before, remove it
            if (seenToolCallIds.has(toolCallId)) {
              return false;
            }

            // Check if this is an incomplete tool call
            // convertToModelMessages requires tool calls to have complete input
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
            const partAny = part as any;
            // Filter out tool calls in "call" state that don't have input (incomplete)
            // Also filter out tool calls in "call" state entirely to be safe
            // Only keep tool calls that are in "result" or "output-available" state
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (partAny.state === "call") {
              // Tool call in progress - skip it to avoid incomplete input errors
              return false;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (partAny.state === "result" && !partAny.input) {
              // Result state but no input - incomplete, skip it
              return false;
            }

            seenToolCallIds.add(toolCallId);
          }
          return true;
        });
        return { ...msg, parts: deduplicatedParts };
      }
      return msg;
    });

    if (processedMessages.length === 0) {
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
        ...convertToModelMessages(processedMessages),
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
