import Anthropic from "@anthropic-ai/sdk";
import { answerSchema, type AIAnswer } from "./ai.validation.js";

const DEFAULT_MODEL = "claude-opus-5-5";

export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function isProviderConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function askClaude(messages: ProviderMessage[]): Promise<string> {
  // The base URL is set here on purpose, an ambient ANTHROPIC_BASE_URL from
  // the shell would otherwise point the app at another provider.
  const client = new Anthropic({
    baseURL: process.env.ANTHROPIC_API_URL ?? "https://api.anthropic.com",
  });

  // Anthropic keeps the system prompt out of the conversation.
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  const chat: Anthropic.Beta.BetaMessageParam[] = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

  const response = await client.beta.messages.create({
    // A refused request is re-run on a fallback model inside the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
    max_tokens: 16000,
    system,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    messages: chat,
  });

  const content = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!content) {
    throw new Error("Claude returned an empty answer");
  }

  return content;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");

  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function parseModelAnswer(text: string): AIAnswer {
  const parsed = answerSchema.safeParse(extractJson(text));

  if (parsed.success) return parsed.data;

  const firstLine =
    text.split("\n").find((line) => line.trim().length > 0)?.trim() ?? "";

  return {
    intent: "overview",
    headline: firstLine.slice(0, 120) || "Workspace assistant",
    narrative: text,
    sections: [],
    followUps: [],
  };
}
