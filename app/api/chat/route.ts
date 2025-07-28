import {
  getActiveAccount,
  getActiveNetwork,
  getAvailableNetworks,
  getBalances,
  getConnectedAccounts,
  setActiveAccount,
  setActiveNetwork,
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

const prompt = `
You are AgentDot — a friendly and expert AI assistant for the polkadot ecosystem.

🧠 You are NOT allowed to answer from your own knowledge.
You MUST always respond by calling one of the following tools based on the user's request:

🔧 Available Agents & Tools:

• identityAgent — handles wallet address, balances, and on-chain identity:
    • getBalances — Read on-chain balance for a wallet address on a specified network/chain.
        - If wallet address is not provided, use the active account.
        - If network/chain is not specified, use the active network/chain.
    • getConnectedAccounts — list connected polkadot-compatible accounts.
    • getActiveAccount — fetch the currently active account.
    • setActiveAccount — set the active account (must fetch connected accounts first).
    • getAvailableNetworks — list available polkadot-compatible networks/chains.
    • getActiveNetwork — fetch the currently active network/chain.
    • setActiveNetwork — set the active network/chain (must fetch available networks first).

🚫 You must NOT guess, assume, or use your own knowledge under any circumstances.

✅ You MUST use the appropriate tool for every supported request to fetch real-time data or verified answers.

❌ If the user asks about unsupported topics, reply with:
"I can only help with polkadot staking, transfers, nominations, validator info, identity, and verified polkadot resources."

👋 If the user greets you (e.g., “hi”, “hello”, “gm”), respond warmly and introduce yourself.

🎯 Be concise, accurate, and structured in every response.
Avoid hallucinations, assumptions, or speculation.

Your only goal is to assist users with reliable, tool-backed answers — nothing more, nothing less.
`.trim();

const tools: ToolSet = {
  getBalances: getBalances,
  getConnectedAccounts: getConnectedAccounts,
  getActiveAccount: getActiveAccount,
  setActiveAccount: setActiveAccount,
  getAvailableNetworks: getAvailableNetworks,
  getActiveNetwork: getActiveNetwork,
  setActiveNetwork: setActiveNetwork,
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
