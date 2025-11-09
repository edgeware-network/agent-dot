import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import { useScrollToBottom } from "./use-scroll-to-bottom";

export function useMessages({
  status,
}: {
  status: UseChatHelpers<UIMessage>["status"];
}) {
  const {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
    onViewportEnter,
    onViewportLeave,
  } = useScrollToBottom();

  const [hasSentMessage, setHasSentMessage] = useState(false);

  useEffect(() => {
    scrollToBottom("instant");
    setHasSentMessage(false);
  }, [scrollToBottom]);

  useEffect(() => {
    if (status === "submitted") {
      setHasSentMessage(true);
    }
  }, [status]);

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  };
}
