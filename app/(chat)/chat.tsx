"use client";
import ChatHeader from "@/app/(chat)/chat-header";
import Messages from "@/app/(chat)/messages";
import { PromptInputForm } from "@/app/(chat)/prompt-input-form";
import { useRefObject } from "@/hooks/use-ref-object";
import { onChatToolCall } from "@/lib/ai";
import { useChat } from "@ai-sdk/react";
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
    selectedExtensionsRef,
    setActiveChainRef,
    setSelectedAccountRef,
  } = useRefObject();

  const { messages, sendMessage, addToolResult } = useChat({
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
        selectedExtensionsRef,
        toolCall,
        addToolResult,
      });
    },
  });

  return (
    <>
      <div className="bg-background flex h-dvh min-w-0 flex-col">
        <ChatHeader />
        <Messages messages={messages} />
        <PromptInputForm sendMessage={sendMessage} />
      </div>
    </>
  );
}
