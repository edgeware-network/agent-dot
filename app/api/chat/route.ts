import { prompt } from "@/agents/prompt";
import {
  bondAgent,
  bondExtraNominationPoolsAgent,
  getActiveAccount,
  getActiveNetwork,
  getAvailableNetworks,
  getAvailableValidators,
  getBalances,
  getConnectedAccounts,
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
  nominateAgent: nominateAgent,
  unbondAgent: unbondAgent,
  joinNominationPoolsAgent: joinNominationPoolsAgent,
  bondExtraNominationPoolsAgent: bondExtraNominationPoolsAgent,
  unbondFromNominationPoolsAgent: unbondFromNominationPoolsAgent,
};

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: UIMessage[] };

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system:
      "You are AgentDot, a friendly and expert AI assistant for the polkadot ecosystem.",
    messages: [
      {
        role: "system",
        content: prompt,
      },
      ...convertToModelMessages(messages),
    ],
    stopWhen: stepCountIs(3), // stop after 3 steps to avoid RPM (requests per minute) limits breach on OpenAI free tier.
    tools,
  });

  return result.toUIMessageStreamResponse();
}
