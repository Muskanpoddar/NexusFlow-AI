
import { answerSchema, type AIAnswer } from "./ai.validation.js";

const DEFAULT_API_URL = "https://api.minimax.io/v1";
const DEFAULT_MODEL = "MiniMax-M3.1-Flash";

export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function isProviderConfigured(): boolean {
  return Boolean(process.env.MINIMAX_API_KEY);
}

export async function askMiniMax(messages: ProviderMessage[]): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY is not configured");
  }

  const baseUrl = (process.env.MINIMAX_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
  const model = process.env.MINIMAX_MODEL ?? DEFAULT_MODEL;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      max_completion_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`MiniMax request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("MiniMax returned an empty answer");
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
