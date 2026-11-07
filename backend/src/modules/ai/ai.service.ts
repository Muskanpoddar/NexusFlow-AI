
import { prisma } from "../../lib/prisma.js";
import { getWorkspaceContext, type WorkspaceContext } from "./ai.context.js";
import { buildMessages, type PromptMessage } from "./ai.prompts.js";
import {
  askMiniMax,
  isProviderConfigured,
  parseModelAnswer,
} from "./ai.provider.js";
import type { AIAnswer } from "./ai.validation.js";

export class AIError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "AIError";
  }
}

async function requireWorkspaceMember(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new AIError("You do not have access to this workspace", 403);
  }
}

async function requireConversation(
  conversationId: string,
  userId: string,
  workspaceId?: string
) {
  const conversation = await prisma.aIConversation.findFirst({
    where: {
      id: conversationId,
      userId,
      ...(workspaceId ? { workspaceId } : {}),
    },
    select: { id: true, title: true },
  });

  if (!conversation) {
    throw new AIError("Conversation not found", 404);
  }

  return conversation;
}

async function getRecentMessages(
  conversationId: string
): Promise<PromptMessage[]> {
  const messages = await prisma.aIMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { role: true, content: true },
  });

  return messages.reverse().map((message) => ({
    role: message.role === "USER" ? "user" : "assistant",
    content: message.content,
  }));
}

function detectIntent(question: string): AIAnswer["intent"] {
  const text = question.toLowerCase();

  if (text.includes("overdue") || text.includes("late")) return "overdue-tasks";
  if (text.includes("unassigned") || text.includes("nobody")) return "unassigned";
  if (text.includes("workload") || text.includes("capacity")) return "workload";
  if (text.includes("priorit") || text.includes("focus")) return "priorities";
  if (text.includes("risk")) return "risk-report";
  if (text.includes("report") || text.includes("summar")) return "weekly-report";
  if (text.includes("project")) return "project-health";

  return "overview";
}

// shortcut: without a provider key the assistant answers from the workspace
// snapshot instead of failing, so the chat and its history keep working.
function buildContextAnswer(
  context: WorkspaceContext,
  question: string
): AIAnswer {
  const open = context.tasks.filter((task) => task.status !== "DONE");
  const overdue = open.filter((task) => task.overdue);
  const unassigned = open.filter((task) => !task.assigneeId);
  const intent = detectIntent(question);

  const headline =
    intent === "overdue-tasks"
      ? `${overdue.length} ${overdue.length === 1 ? "task is" : "tasks are"} overdue`
      : `${context.name}: ${open.length} open ${open.length === 1 ? "task" : "tasks"}`;

  const narrative = `${context.name} tracks ${context.projects.length} ${
    context.projects.length === 1 ? "project" : "projects"
  }, ${open.length} open ${open.length === 1 ? "task" : "tasks"} and ${
    context.members.length
  } ${context.members.length === 1 ? "member" : "members"}.${
    overdue.length
      ? ` ${overdue.length} of them ${overdue.length === 1 ? "is" : "are"} overdue.`
      : ""
  }`;

  const sections: { heading: string; bullets: string[] }[] = [];

  if (overdue.length > 0) {
    sections.push({
      heading: "Overdue work",
      bullets: overdue
        .slice(0, 5)
        .map(
          (task) =>
            `${task.title} — ${task.projectName}${
              task.assigneeName ? ` (${task.assigneeName})` : ", unassigned"
            }`
        ),
    });
  }

  if (intent === "unassigned" && unassigned.length > 0) {
    sections.push({
      heading: "Unassigned work",
      bullets: unassigned
        .slice(0, 5)
        .map((task) => `${task.title} — ${task.projectName}`),
    });
  }

  sections.push({
    heading: "Projects",
    bullets: context.projects
      .slice(0, 5)
      .map(
        (project) =>
          `${project.name}: ${project.completion}% complete, ${project.openTasks} open ${
            project.openTasks === 1 ? "task" : "tasks"
          }`
      ),
  });

  sections.push({
    heading: "Team load",
    bullets: context.members
      .slice(0, 5)
      .map(
        (member) =>
          `${member.name}: ${member.openTasks} open ${
            member.openTasks === 1 ? "task" : "tasks"
          }, ${member.overdueTasks} overdue`
      ),
  });

  return {
    intent,
    headline,
    narrative,
    sections: sections.filter((section) => section.bullets.length > 0),
    followUps: [
      "Which tasks are overdue?",
      "Who is carrying the most open work?",
      "How is each project progressing?",
    ],
  };
}

export async function chatWithAssistant(input: {
  workspaceId: string;
  userId: string;
  question: string;
  conversationId?: string;
}) {
  await requireWorkspaceMember(input.workspaceId, input.userId);

  const providerReady = isProviderConfigured();

  const conversation = input.conversationId
    ? await requireConversation(input.conversationId, input.userId, input.workspaceId)
    : null;

  const context = await getWorkspaceContext(input.workspaceId);

  if (!context) {
    throw new AIError("Workspace not found", 404);
  }

  const history = conversation ? await getRecentMessages(conversation.id) : [];

  let answer: AIAnswer;

  if (providerReady) {
    try {
      answer = parseModelAnswer(
        await askMiniMax(buildMessages(context, input.question, history))
      );
    } catch (error) {
      console.error("AI provider error:", error);

      throw new AIError("The assistant is temporarily unavailable", 502);
    }
  } else {
    answer = buildContextAnswer(context, input.question);
  }

  const conversationId =
    conversation?.id ??
    (
      await prisma.aIConversation.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          title: input.question.slice(0, 80),
        },
        select: { id: true },
      })
    ).id;

  await prisma.aIMessage.createMany({
    data: [
      { conversationId, role: "USER", content: input.question },
      {
        conversationId,
        role: "ASSISTANT",
        content: `${answer.headline}\n${answer.narrative}`,
      },
    ],
  });

  return {
    ...answer,
    source: providerReady ? ("llm" as const) : ("engine" as const),
    conversationId,
  };
}

export async function listConversations(workspaceId: string, userId: string) {
  await requireWorkspaceMember(workspaceId, userId);

  return prisma.aIConversation.findMany({
    where: { workspaceId, userId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
}

export async function getConversationMessages(
  conversationId: string,
  userId: string
) {
  await requireConversation(conversationId, userId);

  return prisma.aIMessage.findMany({
    where: { conversationId },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
