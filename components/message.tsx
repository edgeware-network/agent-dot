"use client";

import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { useTransactions } from "@/hooks/use-transactions";
import { cn, sanitizeText } from "@/lib/utils";
import { Transaction } from "@/types";
import { UseChatHelpers } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { deepEqual } from "fast-equals";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useRef } from "react";
import { PulseLoader, SyncLoader } from "react-spinners";

function PurePreviewMessage({
  message,
  isStreaming,
  isLast,
  requiresScrollToBottom,
  sendMessage,
}: {
  message: UIMessage;
  isStreaming: boolean;
  isLast: boolean;
  requiresScrollToBottom: boolean;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
}) {
  const hasContent = message.parts.some(
    (part) => part.type === "text" && part.text.trim().length > 0,
  );
  const isLoading =
    message.role === "assistant" && isLast && (isStreaming || !hasContent);

  const handleToolCallId = useRef(new Set<string>());
  const { sendTransaction } = useTransactions();

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="group/message mx-auto w-full max-w-3xl px-4"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div className="font-outfit my-2 flex w-full gap-4 text-base shadow-sm group-data-[role=user]/message:ml-auto group-data-[role=user]/message:w-[70%] group-data-[role=user]/message:max-w-2xl sm:group-data-[role=user]/message:w-fit">
          <div
            className={cn("flex w-full flex-col gap-4", {
              "min-h-96":
                message.role === "assistant" && requiresScrollToBottom,
            })}
          >
            {isLoading && !hasContent ? (
              <div className="flex items-center gap-2">
                <SyncLoader color="#bebebe" size={6} />
              </div>
            ) : (
              <div
                className={cn("flex flex-col gap-4", {
                  "rounded-xl bg-[#bebebe] px-3 py-2 text-[#202020]":
                    message.role === "assistant" && hasContent,
                })}
              >
                {message.parts.map((part, index) => {
                  const { type } = part;
                  const key = `message-${message.id}-part-${String(index)}`;

                  if (type === "text") {
                    return (
                      <div
                        data-testid="message-content"
                        className={cn("flex flex-col gap-4", {
                          "rounded-2xl rounded-br-none bg-[#202020] px-3 py-2 text-[#bebebe]":
                            message.role === "user",
                        })}
                        key={key}
                      >
                        {part.text.trim() && (
                          <MemoizedMarkdown
                            id={message.id}
                            key={key}
                            content={sanitizeText(part.text)}
                          />
                        )}
                      </div>
                    );
                  }
                  //TODO: add other tools here!
                  if (
                    type === "tool-transferAgent" &&
                    !handleToolCallId.current.has(part.toolCallId)
                  ) {
                    handleToolCallId.current.add(part.toolCallId);
                    const { state, toolCallId } = part;

                    if (state === "output-available") {
                      const { tx } = part.output as {
                        tx: Transaction;
                      };

                      void sendTransaction({
                        ...tx,
                        sendMessage,
                      });

                      return <div key={toolCallId}></div>;
                    }
                  }
                  if (type === "tool-xcmAgent") {
                    if (part.state === "input-available") {
                      const input = part.input;
                      return (
                        <div key={part.toolCallId}>
                          {JSON.stringify(input, null, 2)}
                        </div>
                      );
                    }
                    if (part.state === "output-available") {
                      const output = part.output;
                      return (
                        <div key={part.toolCallId}>
                          {JSON.stringify(output, null, 2)}
                        </div>
                      );
                    }
                  }
                  if (type === "tool-xcmStablecoinFromAssetHub") {
                    if (part.state === "input-available") {
                      const input = part.input;
                      return (
                        <div key={part.toolCallId}>
                          {JSON.stringify(input, null, 2)}
                        </div>
                      );
                    }
                    if (part.state === "output-available") {
                      const output = part.output;
                      return (
                        <div key={part.toolCallId}>
                          {JSON.stringify(output, null, 2)}
                        </div>
                      );
                    }
                  }
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.isStreaming !== nextProps.isStreaming) return false;
    if (prevProps.requiresScrollToBottom !== nextProps.requiresScrollToBottom)
      return false;
    if (prevProps.isLast !== nextProps.isLast) return false;
    if (!deepEqual(prevProps.message.parts, nextProps.message.parts))
      return false;
    if (!deepEqual(prevProps.sendMessage, nextProps.sendMessage)) return false;

    return false;
  },
);

export function ThinkingMessage() {
  const role = "assistant";

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="group/message mx-auto min-h-96 w-full max-w-3xl px-4"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cn(
          "flex w-full gap-4 rounded-2xl group-data-[role=user]/message:ml-auto group-data-[role=user]/message:w-fit group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:px-3 group-data-[role=user]/message:py-2",
          {
            "group-data-[role=user]/message:bg-muted": true,
          },
        )}
      >
        <div className="font-outfit my-auto flex w-full items-center gap-[2px] font-medium tracking-tight">
          <div className="text-info text-lg">AgentDot is thinking</div>
          <PulseLoader className="mt-1" color="#bebebe" size={4} />
        </div>
      </div>
    </motion.div>
  );
}
