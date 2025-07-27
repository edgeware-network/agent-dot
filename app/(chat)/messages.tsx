import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { UIMessage } from "ai";

export default function Messages({ messages }: { messages: UIMessage[] }) {
  return (
    <>
      <div className="relative flex min-w-0 flex-1 flex-col gap-6 overflow-y-scroll pt-4">
        <div className="mx-auto w-full max-w-3xl px-4">
          {messages.map((message) => (
            <div key={message.id} className="whitespace-pre-wrap">
              {message.role === "user" ? "User: " : "AI: "}
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return (
                      <MemoizedMarkdown
                        key={`${message.id}-part-${String(i)}`}
                        content={part.text}
                        id={`${message.id}-part-${String(i)}`}
                      />
                    );
                }
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
