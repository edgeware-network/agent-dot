"use client";

import { Greeting } from "@/components/greeting";
import { PreviewMessage, ThinkingMessage } from "@/components/message";
import { UseChatHelpers } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { deepEqual } from "fast-equals";
import { memo } from "react";

interface MessagesProps {
  messages: UIMessage[];
  status: UseChatHelpers<UIMessage>["status"];
}
function PureMessages({ messages, status }: MessagesProps) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-6 overflow-y-scroll pt-4">
      {messages.length === 0 && <Greeting />}
      <div className="mx-auto w-full max-w-3xl px-4 text-pretty wrap-break-word">
        {messages.map((message, index) => (
          <PreviewMessage
            key={message.id}
            message={message}
            isStreaming={status === "streaming"}
            isLast={index === messages.length - 1}
          />
        ))}
        {status === "submitted" &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && <ThinkingMessage />}
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
