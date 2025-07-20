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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function Chat() {
  const form = useForm<ChatSchema>({
    resolver: zodResolver(chatSchema),
    defaultValues: {
      prompt: "",
    },
  });

  function onSubmit(data: ChatSchema) {
    toast.message(`${data.prompt} is being processed...`);
    form.reset();
  }

  return (
    <>
      <div className="bg-background flex h-dvh min-w-0 flex-col max-sm:pb-2">
        <ChatHeader />
        <Messages />
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
