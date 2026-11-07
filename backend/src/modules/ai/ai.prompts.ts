
import type { WorkspaceContext } from "./ai.context.js";

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// shortcut: only the most urgent tasks reach the model, raise the cap when a workspace grows
const MAX_TASKS_IN_PROMPT = 80;

const DAY = 86_400_000;

export const AI_SYSTEM_PROMPT = `You are the NexusFlow workspace assistant. You answer questions about a project management workspace using only the snapshot you are given.

Rules:
- The snapshot is the single source of truth. Never invent projects, tasks, people, dates or numbers.
- If the snapshot does not answer the question, say plainly what is missing.
- Be concrete and short: name the projects, tasks, people and dates that matter.
- Reply with one JSON object and nothing else, no markdown and no commentary:
{"intent":"overview|project-health|overdue-tasks|workload|priorities|unassigned|weekly-report|project-summary|risk-report","headline":"one short line","narrative":"two to four sentences","sections":[{"heading":"short heading","bullets":["one fact per bullet"]}],"followUps":["a question the user could ask next"]}
- Use between one and four sections, two to five bullets each, and two to four follow ups.`;

function formatDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "no date";
}

function daysOverdue(dueDate: Date): number {
  return Math.max(0, Math.round((Date.now() - dueDate.getTime()) / DAY));
}

export function buildSnapshot(context: WorkspaceContext): string {
  const lines: string[] = [];

  lines.push(`Workspace: ${context.name}`);
  lines.push(`Today: ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push(`Projects (${context.projects.length}):`);

  for (const project of context.projects) {
    lines.push(
      `- ${project.name} | ${project.status} | ${project.priority} | owner ${project.ownerName} | ${project.memberCount} members | ${project.completion}% done, ${project.openTasks}/${project.totalTasks} open, ${project.overdueTasks} overdue | starts ${formatDate(project.startDate)}, due ${formatDate(project.dueDate)}`
    );
  }

  const openTasks = context.tasks.filter((task) => task.status !== "DONE");

  const ranked = [...openTasks].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;

    return (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity);
  });

  lines.push("");
  lines.push(`Open tasks (${openTasks.length}):`);

  for (const task of ranked.slice(0, MAX_TASKS_IN_PROMPT)) {
    const overdue = task.overdue && task.dueDate
      ? `, overdue ${daysOverdue(task.dueDate)} days`
      : "";

    lines.push(
      `- [${task.status}][${task.priority}] ${task.title} | ${task.projectName} | ${task.assigneeName ?? "unassigned"} | due ${formatDate(task.dueDate)}${overdue}`
    );
  }

  if (ranked.length > MAX_TASKS_IN_PROMPT) {
    lines.push(`- ${ranked.length - MAX_TASKS_IN_PROMPT} more open tasks not listed`);
  }

  lines.push("");
  lines.push(`Members (${context.members.length}):`);

  for (const member of context.members) {
    lines.push(
      `- ${member.name} (${member.role}) | ${member.openTasks} open, ${member.overdueTasks} overdue, ${member.highPriorityTasks} high priority`
    );
  }

  return lines.join("\n");
}

export function buildMessages(
  context: WorkspaceContext,
  question: string,
  history: PromptMessage[]
): PromptMessage[] {
  return [
    { role: "system", content: AI_SYSTEM_PROMPT },
    ...history,
    {
      role: "user",
      content: `Workspace snapshot:\n${buildSnapshot(context)}\n\nQuestion: ${question}`,
    },
  ];
}
