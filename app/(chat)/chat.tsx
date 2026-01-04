"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import ChatHeader from "@/app/(chat)/chat-header";
import { Messages } from "@/app/(chat)/messages";
import { PromptInputForm } from "@/app/(chat)/prompt-input-form";
import { TransactionQueue } from "@/components/transaction-queue";
import { useRefObject } from "@/hooks/use-ref-object";
import { onChatToolCall } from "@/lib/ai";
import { useChat, type UIMessage, type UseChatHelpers } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";

export default function Chat() {
  const {
    activeChainRef,
    apiRef,
    connectedAccountsRef,
    selectedAccountRef,
    setActiveChainRef,
    setSelectedAccountRef,
    clientRef,
    setActiveRpcChainRef,
  } = useRefObject();

  const { messages, sendMessage, addToolResult, status, stop } = useChat({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    async onToolCall({ toolCall }) {
      // client side tool execution
      await onChatToolCall({
        apiRef,
        activeChainRef,
        setActiveChainRef,
        connectedAccountsRef,
        selectedAccountRef,
        setSelectedAccountRef,
        clientRef,
        toolCall,
        setActiveRpcChainRef,
        addToolResult,
      });
    },
  });

  // Pre-check: If the user is asking identity, hydrate via getActiveAccount first
  const identityRegex =
    /\b(what\s+is\s+my\s+(account|address|name)|who\s+am\s+i)\b/i;
  const preSendMessage: UseChatHelpers<UIMessage>["sendMessage"] = async (
    message,
    options,
  ) => {
    let content = "";
    if (typeof message === "string") {
      content = message;
    } else if (message && typeof (message as any).text === "string") {
      content = (message as any).text as string;
    }
    try {
      if (identityRegex.test(content)) {
        // Hydrate selection from storage for freshness; then let the model decide tools
        const raw = window.localStorage.getItem("agent-dot:selected-account");
        if (raw) {
          try {
            const { address, name } = JSON.parse(raw) as {
              address?: string;
              name?: string;
            };
            let found = address
              ? connectedAccountsRef.current.find((a) => a.address === address)
              : undefined;
            if (!found && name) {
              found = connectedAccountsRef.current.find((a) => a.name === name);
            }
            if (found) {
              const current = selectedAccountRef.current;
              if (current?.address !== found.address) {
                setSelectedAccountRef.current(found);
              }
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      // ignore and fall back
    }

    return sendMessage(message as any, options as any);
  };

  return (
    <>
      <div className="bg-background flex h-dvh min-w-0 flex-col">
        <ChatHeader />
        <Messages
          messages={messages}
          status={status}
          sendMessage={preSendMessage}
          addToolResult={addToolResult}
        />
        <div className="border-t-border border-t px-4 py-2">
          <TransactionQueue sendMessage={preSendMessage} />
        </div>
        <PromptInputForm
          sendMessage={preSendMessage}
          status={status}
          stop={stop}
        />
      </div>
    </>
  );
}
