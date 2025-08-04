"use client";

import { ChainBlockInfo } from "@/components/account";
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
import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { memo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

interface PromptInputFormProps {
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
}

function PurePromptInputForm({ sendMessage }: PromptInputFormProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const form = useForm<ChatSchema>({
    resolver: zodResolver(chatSchema),
    defaultValues: {
      prompt: "",
    },
  });

  useEffect(() => {
    if (textAreaRef.current) {
      adjustHeight();
    }
  }, []);

  function adjustHeight() {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = `${String(textAreaRef.current.scrollHeight)}px`;
    }
  }

  function resetHeight() {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = "64px";
    }
  }

  function onSubmit(data: ChatSchema) {
    void sendMessage({ text: data.prompt.trim() });
    resetHeight();
    form.reset();
  }

  return (
    <div className="relative flex w-full flex-col gap-4">
      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="bg-background mx-auto flex w-full max-w-[40rem] flex-col items-stretch justify-start gap-2 px-4 pb-4 text-left shadow-md md:max-w-3xl md:pb-4"
        >
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem className="border-border flex w-full flex-col gap-1 rounded-[1.2rem] border-2 bg-[#0d0d0d] p-4 tracking-tight">
                <FormControl>
                  <Textarea
                    rows={2}
                    ref={(e) => {
                      field.ref(e);
                      textAreaRef.current = e;
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    className="font-work-sans max-h-[calc(75dvh)] min-h-[24px] resize-none overflow-hidden rounded-none border-none bg-inherit p-0 pb-10 text-[18px] leading-[24px] font-medium tracking-tight outline-none placeholder:text-[#808080] focus-visible:ring-0 md:text-[18px] md:leading-[24px]"
                    placeholder="Ask anything"
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
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e);
                      adjustHeight();
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    disabled={field.disabled}
                  />
                </FormControl>
                <div className="item-stretch flex h-4 justify-between">
                  <FormMessage className="font-work-sans flex h-4 items-center text-sm font-medium tracking-tight" />
                  <ChainBlockInfo />
                </div>
              </FormItem>
            )}
          />
          <Button type="submit" className="sr-only" />
        </form>
      </Form>
    </div>
  );
}

export const PromptInputForm = memo(PurePromptInputForm);
