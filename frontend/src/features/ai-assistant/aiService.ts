import type { WorkspaceData } from "../../store/workspace.store";
import { buildLocalAnswer, type AIAnswer } from "./aiEngine.ts";

/**
 * Asks the assistant. When VITE_AI_API_URL is set the Node.js AI service
 * answers first and the on-device engine is only used as a fallback.
 */
export async function askAssistant(
  question: string,
  data: WorkspaceData,
  apiUrl: string | undefined = import.meta.env?.VITE_AI_API_URL
): Promise<AIAnswer> {
  const local = buildLocalAnswer(question, data);

  if (!apiUrl) return local;

  try {
    const response = await fetch(`${apiUrl}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, workspace: data }),
    });

    if (!response.ok) return local;

    const remote = (await response.json()) as Partial<AIAnswer>;

    return {
      intent: remote.intent ?? local.intent,
      headline: remote.headline ?? local.headline,
      narrative: remote.narrative ?? local.narrative,
      sections: remote.sections?.length ? remote.sections : local.sections,
      projects: remote.projects ?? local.projects,
      tasks: remote.tasks ?? local.tasks,
      workload: remote.workload ?? local.workload,
      followUps: remote.followUps?.length ? remote.followUps : local.followUps,
      source: "llm",
    };
  } catch {
    return local;
  }
}
