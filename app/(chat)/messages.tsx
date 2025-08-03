"use client";

import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { useTransactions } from "@/hooks/use-transactions";
import {
  TCurrency,
  TNodeDotKsmWithRelayChains,
  TNodeWithRelayChains,
} from "@paraspell/sdk";
import { UIMessage } from "ai";
import { useRef } from "react";

export default function Messages({ messages }: { messages: UIMessage[] }) {
  // to prevent duplicate tool calls
  const toolCallId = useRef(new Set<string>());
  const { sendTransaction, sendXcmTransaction, sendXcmStablecoinTransaction } =
    useTransactions();
  return (
    <>
      <div className="relative flex min-w-0 flex-1 flex-col gap-6 overflow-y-scroll pt-4">
        <div className="mx-auto w-full max-w-3xl px-4">
          {/* TODO: Fix this message component with useMemo refer vercel docs */}
          {messages.map((message) => (
            <div key={message.id} className="whitespace-pre-wrap">
              {message.role === "user" ? "User: " : "AI: "}
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return (
                      // TODO: UI fix
                      <MemoizedMarkdown
                        key={`${message.id}-part-${String(i)}`}
                        content={part.text.trim()}
                        id={`${message.id}-part-${String(i)}`}
                      />
                    );
                  // TODO: Bug Fix: the tool is not working as intended
                  case "tool-transferAgent": {
                    switch (part.state) {
                      case "input-available": {
                        if (
                          !toolCallId.current.has(`input-${part.toolCallId}`)
                        ) {
                          toolCallId.current.add(`input-${part.toolCallId}`);
                          const input = part.input as {
                            to: string;
                            amount: string;
                            confirm: string;
                          };

                          return (
                            <MemoizedMarkdown
                              key={`${message.id}-part-${String(i)}`}
                              content={JSON.stringify(input, null, 2)}
                              id={`${message.id}-part-${String(i)}`}
                            />
                          );
                        }
                        break;
                      }
                      case "output-available": {
                        if (!toolCallId.current.has(part.toolCallId)) {
                          toolCallId.current.add(part.toolCallId);
                          const output = part.output as {
                            success: boolean;
                            tx: {
                              to: string;
                              amount: string;
                            };
                            message: string;
                          };
                          void (async () => {
                            await sendTransaction({
                              to: output.tx.to,
                              amount: output.tx.amount,
                            });
                          })();
                          return (
                            <MemoizedMarkdown
                              key={`${message.id}-part-${String(i)}`}
                              content={output.message}
                              id={`${message.id}-part-${String(i)}`}
                            />
                          );
                        }
                      }
                    }
                    break;
                  }
                  // TODO: this tool runs twice how?
                  case "tool-xcmAgent": {
                    switch (part.state) {
                      case "input-available":
                        return;
                      case "output-available": {
                        if (!toolCallId.current.has(part.toolCallId)) {
                          toolCallId.current.add(part.toolCallId);
                          const output = part.output as {
                            tx: {
                              src: TNodeDotKsmWithRelayChains;
                              dst: TNodeDotKsmWithRelayChains;
                              amount: string;
                              symbol: string;
                              address: string;
                            };
                            message: string;
                          };

                          void (async () => {
                            await sendXcmTransaction({
                              from: output.tx.src,
                              to: output.tx.dst,
                              amount: output.tx.amount,
                              symbol: output.tx.symbol,
                              address: output.tx.address,
                            });
                          })();

                          return (
                            <MemoizedMarkdown
                              key={`${message.id}-${part.toolCallId}-${String(i)}`}
                              content={output.message}
                              id={`${message.id}-${part.toolCallId}-${String(i)}`}
                            />
                          );
                        }
                      }
                    }
                    break;
                  }
                  // TODO: this tool runs twice how?
                  case "tool-xcmStablecoinFromAssetHub": {
                    switch (part.state) {
                      case "input-available":
                        return;
                      case "output-available": {
                        if (!toolCallId.current.has(part.toolCallId)) {
                          toolCallId.current.add(part.toolCallId);
                          const output = part.output as {
                            tx: {
                              src: TNodeDotKsmWithRelayChains;
                              dst: TNodeWithRelayChains;
                              amount: string;
                              id: string;
                              address: string;
                            };
                            message: string;
                          };

                          void (async () => {
                            await sendXcmStablecoinTransaction({
                              from: output.tx.src,
                              to: output.tx.dst,
                              amount: output.tx.amount,
                              id: output.tx.id as TCurrency,
                              address: output.tx.address,
                            });
                          })();

                          return (
                            <MemoizedMarkdown
                              key={`${message.id}-${part.toolCallId}-${String(i)}`}
                              content={output.message}
                              id={`${message.id}-${part.toolCallId}-${String(i)}`}
                            />
                          );
                        }
                      }
                    }
                  }
                }
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
