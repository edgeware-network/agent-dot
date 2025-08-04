"use client";
import ChatHeader from "@/app/(chat)/chat-header";
import Messages from "@/app/(chat)/messages";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ChatSchema, chatSchema } from "@/db/schema";
import { useSyncedRef } from "@/hooks/use-sync-ref";
import { onChatToolCall } from "@/lib/ai";
import { AvailableApis, ChainConfig } from "@/papi-config";
import { ExtenstionContext } from "@/providers/extension-provider";
import { useLightClientApi } from "@/providers/light-client-provider";
import { useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import {
  InjectedExtension,
  InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer";
import { use } from "react";
import { useForm } from "react-hook-form";

export default function Chat() {
  const { api, activeChain, setActiveChain } = useLightClientApi();
  const {
    connectedAccounts,
    selectedAccount,
    setSelectedAccount,
    selectedExtensions,
  } = use(ExtenstionContext);

  // refs to pass down to useChat
  const activeChainRef = useSyncedRef<ChainConfig>(activeChain);
  const setActiveChainRef = useSyncedRef<typeof setActiveChain>(setActiveChain);
  const apiRef = useSyncedRef<AvailableApis | null>(api);
  const connectedAccountsRef =
    useSyncedRef<InjectedPolkadotAccount[]>(connectedAccounts);
  const selectedAccountRef = useSyncedRef<
    | (InjectedPolkadotAccount & {
        extension: InjectedExtension;
      })
    | null
  >(selectedAccount);
  const setSelectedAccountRef =
    useSyncedRef<typeof setSelectedAccount>(setSelectedAccount);
  const selectedExtensionsRef =
    useSyncedRef<InjectedExtension[]>(selectedExtensions);

  const form = useForm<ChatSchema>({
    resolver: zodResolver(chatSchema),
    defaultValues: {
      prompt: "",
    },
  });

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

  function onSubmit(data: ChatSchema) {
    void sendMessage({ text: data.prompt.trim() });
    form.reset();
  }

  return (
    <>
      <div className="bg-background flex h-dvh min-w-0 flex-col max-sm:pb-2">
        <ChatHeader />
        <Messages messages={messages} />
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="bg-background mx-auto flex w-full max-w-[40rem] flex-col items-stretch justify-start gap-2 rounded-2xl px-4 pb-4 text-left shadow-md md:max-w-3xl md:pb-6"
          >
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem className="border-border bg-background flex flex-col gap-1 rounded-3xl border-2 p-4 tracking-tight">
                  <FormControl>
                    <Textarea
                      rows={4}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      className="font-work-sans placeholder:text-placeholder bg-background h-12 max-h-[calc(75dvh)] min-h-[48px] resize-none overflow-hidden rounded-none border-none p-0 pb-10 text-[18px] leading-[24px] font-medium tracking-tight outline-none focus-visible:ring-0 md:text-[18px] md:leading-[24px]"
                      placeholder="Ask anything..."
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          !e.nativeEvent.isComposing
                        ) {
                          e.preventDefault();
                          void form.handleSubmit(onSubmit)();
                        }
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="font-work-sans h-4 text-sm font-medium tracking-tight" />
                </FormItem>
              )}
            />
            <Button type="submit" className="sr-only" />
          </form>
        </Form>
      </div>
    </>
  );
}
