import { z } from "zod";

export const chatSchema = z.object({
  prompt: z
    .string()
    .min(1, { message: "Prompt is required" })
    .max(1000, { message: "Prompt is too long" }),
});

export type ChatSchema = z.infer<typeof chatSchema>;
