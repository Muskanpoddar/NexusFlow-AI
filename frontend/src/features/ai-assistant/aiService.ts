import { apiRequest } from "../../services/api/apiClient.ts";
import type { WorkspaceData } from "../../store/workspace.store";
import { buildLocalAnswer, type AIAnswer } from "./aiEngine.ts";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  answer?: AIAnswer;
}

export interface AssistantContext {
  token: string;
  workspaceId: string;
  conversationId?: string | null;
}

export interface AssistantReply {
  answer: AIAnswer;
  conversationId: string | null;
}

interface RemoteAnswer extends Partial<AIAnswer> {
  conversationId?: string;
}

interface StoredMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
}

/**
 * Asks the assistant. The backend answers first when the workspace API is
 * reachable, the on-device engine is only used as a fallback.
 */
export async function askAssistant(
  question: string,
  data: WorkspaceData,
  context?: AssistantContext
): Promise<AssistantReply> {
  const local = buildLocalAnswer(question, data);

  if (!context?.token || !context.workspaceId) {
    return { answer: local, conversationId: null };
  }

  try {
    const remote = await apiRequest<RemoteAnswer>("/api/ai/chat", {
      method: "POST",
      body: {
        workspaceId: context.workspaceId,
        question,
        ...(context.conversationId
          ? { conversationId: context.conversationId }
          : {}),
      },
      token: context.token,
    });

    return {
      answer: {
        intent: remote.intent ?? local.intent,
        headline: remote.headline ?? local.headline,
        narrative: remote.narrative ?? local.narrative,
        sections: remote.sections?.length ? remote.sections : local.sections,
        projects: remote.projects ?? local.projects,
        tasks: remote.tasks ?? local.tasks,
        workload: remote.workload ?? local.workload,
        followUps: remote.followUps?.length ? remote.followUps : local.followUps,
        source: remote.source ?? "llm",
      },
      conversationId: remote.conversationId ?? context.conversationId ?? null,
    };
  } catch {
    return {
      answer: local,
      conversationId: context.conversationId ?? null,
    };
  }
}

/** Restores the most recent persisted conversation for a workspace. */
export async function loadConversationHistory(
  token: string,
  workspaceId: string
): Promise<{ conversationId: string | null; messages: ChatMessage[] }> {
  const conversations = await apiRequest<
    { id: string; title: string | null }[]
  >(`/api/ai/workspaces/${workspaceId}/conversations`, { token });

  const latest = conversations[0];

  if (!latest) {
    return { conversationId: null, messages: [] };
  }

  const stored = await apiRequest<StoredMessage[]>(
    `/api/ai/conversations/${latest.id}/messages`,
    { token }
  );

  return {
    conversationId: latest.id,
    messages: stored.map((message) => ({
      id: message.id,
      role: message.role === "USER" ? "user" : "assistant",
      text: message.content,
    })),
  };
}
