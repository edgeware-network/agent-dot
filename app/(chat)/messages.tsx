"use client";

import { Greeting } from "@/components/greeting";
import { PreviewMessage, ThinkingMessage } from "@/components/message";
import { useMessages } from "@/hooks/use-messages";
import { UseChatHelpers } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { deepEqual } from "fast-equals";
import { motion } from "framer-motion";
import { memo } from "react";

interface MessagesProps {
  messages: UIMessage[];
  status: UseChatHelpers<UIMessage>["status"];
}
function PureMessages({ messages, status }: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({
    status,
  });

  return (
    <div
      ref={messagesContainerRef}
      className="relative flex min-w-0 flex-1 flex-col gap-6 overflow-y-scroll pt-4"
    >
      {messages.length === 0 && <Greeting />}
      <div className="mx-auto w-full max-w-3xl px-4 text-pretty wrap-break-word">
        {messages.map((message, index) => (
          <PreviewMessage
            key={message.id}
            message={message}
            isStreaming={status === "streaming"}
            isLast={index === messages.length - 1}
            requiresScrollToBottom={
              index === messages.length - 1 && hasSentMessage
            }
          />
        ))}
        {status === "submitted" &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && <ThinkingMessage />}

        <motion.div
          ref={messagesEndRef}
          className="min-h-[24px] min-w-[24px] shrink-0"
          onViewportLeave={onViewportLeave}
          onViewportEnter={onViewportEnter}
        />
      </div>
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!deepEqual(prevProps.messages, nextProps.messages)) return false;

  return false;
});
