
import { z } from "zod";

export const chatSchema = z.object({
  workspaceId: z.string().min(1),
  question: z.string().trim().min(2).max(1000),
  conversationId: z.string().min(1).optional(),
});

export type ChatInput = z.infer<typeof chatSchema>;

export const intentSchema = z.enum([
  "overview",
  "project-health",
  "overdue-tasks",
  "workload",
  "priorities",
  "unassigned",
  "weekly-report",
  "project-summary",
  "risk-report",
]);

export const reportSectionSchema = z.object({
  heading: z.string().trim().catch("Key points"),
  bullets: z.array(z.string()).catch([]),
});

// The model answers loosely, so every field falls back instead of failing the whole answer.
export const answerSchema = z.object({
  intent: intentSchema.catch("overview").default("overview"),
  headline: z
    .string()
    .trim()
    .min(1)
    .catch("Workspace assistant")
    .default("Workspace assistant"),
  narrative: z.string().trim().catch("").default(""),
  sections: z.array(reportSectionSchema).catch([]).default([]),
  followUps: z.array(z.string()).catch([]).default([]),
});

export type AIAnswer = z.infer<typeof answerSchema>;
