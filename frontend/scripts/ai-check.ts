import assert from "node:assert/strict";

import {
  analyzeProject,
  analyzeTasks,
  analyzeWorkload,
  buildLocalAnswer,
  detectIntent,
  isOverdue,
} from "../src/features/ai-assistant/aiEngine.ts";
import { askAssistant } from "../src/features/ai-assistant/aiService.ts";
import type { Project } from "../src/types/project.ts";
import type { Task } from "../src/types/task.ts";
import type { TeamMember } from "../src/types/team.ts";
import type { WorkspaceData } from "../src/store/workspace.store.tsx";

const today = new Date("2026-11-06T00:00:00");

const projects: Project[] = [
  {
    id: "p1",
    workspaceId: "w1",
    name: "Alpha",
    description: "",
    status: "Active",
    priority: "High",
    ownerId: "m1",
    memberIds: ["m1"],
    category: "Development",
    startDate: "2026-10-01",
    dueDate: "2026-10-20",
    createdAt: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "p2",
    workspaceId: "w1",
    name: "Beta",
    description: "",
    status: "Active",
    priority: "Medium",
    ownerId: "m2",
    memberIds: ["m2"],
    category: "Design",
    startDate: "2026-11-01",
    dueDate: "2026-12-20",
    createdAt: "2026-11-01T09:00:00.000Z",
  },
];

const members: TeamMember[] = [
  {
    id: "m1",
    workspaceId: "w1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "Admin",
    department: "Engineering",
    joinedAt: "Jan 2026",
  },
  {
    id: "m2",
    workspaceId: "w1",
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "Member",
    department: "Design",
    joinedAt: "Feb 2026",
  },
];

const tasks: Task[] = [
  {
    id: "t1",
    workspaceId: "w1",
    projectId: "p1",
    title: "Ship v1",
    description: "",
    status: "Done",
    priority: "High",
    assigneeId: "m1",
    dueDate: "2026-10-10",
    createdAt: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "t2",
    workspaceId: "w1",
    projectId: "p1",
    title: "Fix login bug",
    description: "",
    status: "To Do",
    priority: "High",
    assigneeId: "m1",
    dueDate: "2026-10-25",
    createdAt: "2026-10-02T09:00:00.000Z",
  },
  {
    id: "t3",
    workspaceId: "w1",
    projectId: "p1",
    title: "Write release notes",
    description: "",
    status: "To Do",
    priority: "Medium",
    assigneeId: null,
    dueDate: "2026-11-20",
    createdAt: "2026-10-03T09:00:00.000Z",
  },
  {
    id: "t4",
    workspaceId: "w1",
    projectId: "p2",
    title: "Design system",
    description: "",
    status: "Done",
    priority: "Medium",
    assigneeId: "m2",
    dueDate: "2026-11-02",
    createdAt: "2026-11-01T09:00:00.000Z",
  },
  {
    id: "t5",
    workspaceId: "w1",
    projectId: "p2",
    title: "Component library",
    description: "",
    status: "In Progress",
    priority: "High",
    assigneeId: "m1",
    dueDate: "2026-11-08",
    createdAt: "2026-11-02T09:00:00.000Z",
  },
];

const workspace: WorkspaceData = {
  projects,
  tasks,
  members,
  activities: [],
};

const checks: { name: string; run: () => void | Promise<void> }[] = [
  {
    name: "overdue detection ignores finished work",
    run: () => {
      assert.equal(isOverdue(tasks[1], today), true);
      assert.equal(isOverdue(tasks[0], today), false);
      assert.equal(isOverdue(tasks[4], today), false);
    },
  },
  {
    name: "a project past its deadline is critical",
    run: () => {
      const insight = analyzeProject(projects[0], tasks, today);

      assert.equal(insight.health, "critical");
      assert.equal(insight.completion, 33);
      assert.equal(insight.overdueTasks, 1);
      assert.equal(insight.unassignedTasks, 1);
      assert.equal(insight.daysToDue, -17);
      assert.ok(insight.reasons.length > 0);
    },
  },
  {
    name: "a healthy project stays on track",
    run: () => {
      const insight = analyzeProject(projects[1], tasks, today);

      assert.equal(insight.health, "on-track");
      assert.equal(insight.completion, 50);
    },
  },
  {
    name: "overdue high priority work ranks first",
    run: () => {
      const ranked = analyzeTasks(tasks, projects, members, today);

      assert.equal(ranked[0].id, "t2");
      assert.ok(ranked[0].flags.includes("overdue"));
      assert.ok(ranked[0].flags.includes("high"));
      assert.ok(ranked[0].score > 90);
      assert.equal(ranked.find((task) => task.id === "t3")?.flags.includes("unassigned"), true);
    },
  },
  {
    name: "workload reflects open tasks per member",
    run: () => {
      const workload = analyzeWorkload(members, tasks, today);
      const ada = workload.find((item) => item.id === "m1");
      const grace = workload.find((item) => item.id === "m2");

      assert.equal(ada?.open, 2);
      assert.equal(ada?.level, "balanced");
      assert.equal(ada?.overdue, 1);
      assert.equal(grace?.open, 0);
      assert.equal(grace?.level, "available");
    },
  },
  {
    name: "questions route to the right intent",
    run: () => {
      const intent = (question: string) =>
        detectIntent(question, projects, members).intent;

      assert.equal(intent("Which projects are falling behind?"), "project-health");
      assert.equal(intent("What tasks are overdue?"), "overdue-tasks");
      assert.equal(intent("Summarize my team's workload."), "workload");
      assert.equal(intent("What should I work on first?"), "priorities");
      assert.equal(intent("Give me a weekly progress report"), "weekly-report");
      assert.equal(intent("Which tasks have no assignee?"), "unassigned");
      assert.equal(intent("Show me the risk analysis"), "risk-report");
      assert.equal(intent("Tell me about Alpha"), "project-summary");
      assert.equal(intent("hello there"), "overview");
    },
  },
  {
    name: "every answer is complete",
    run: () => {
      const questions = [
        "Which projects are falling behind?",
        "What tasks are overdue?",
        "Summarize my team's workload.",
        "What should I work on first?",
        "Give me a weekly progress report",
        "Which tasks have no assignee?",
        "Show me the risk analysis",
        "Tell me about Alpha",
        "hello there",
      ];

      for (const question of questions) {
        const answer = buildLocalAnswer(question, workspace);

        assert.ok(answer.headline.length > 0, question);
        assert.ok(answer.narrative.length > 0, question);
        assert.ok(answer.followUps.length > 0, question);
        assert.ok(answer.sections.length > 0, question);
      }
    },
  },
  {
    name: "overdue answer lists the overdue task only",
    run: () => {
      const answer = buildLocalAnswer("What tasks are overdue?", workspace);

      assert.equal(answer.intent, "overdue-tasks");
      assert.equal(answer.tasks.length, 1);
      assert.equal(answer.tasks[0].id, "t2");
      assert.equal(answer.headline, "1 task is overdue");
    },
  },
  {
    name: "project summary targets the named project",
    run: () => {
      const answer = buildLocalAnswer("Tell me about Alpha", workspace);

      assert.equal(answer.intent, "project-summary");
      assert.equal(answer.projects.length, 1);
      assert.equal(answer.projects[0].name, "Alpha");
    },
  },
  {
    name: "service answers locally when no api url is configured",
    run: async () => {
      const answer = await askAssistant("What tasks are overdue?", workspace);

      assert.equal(answer.source, "engine");
      assert.equal(answer.intent, "overdue-tasks");
      assert.equal(answer.tasks.length, 1);
    },
  },
  {
    name: "service merges a remote answer over the local one",
    run: async () => {
      const original = globalThis.fetch;

      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            headline: "Remote headline",
            narrative: "Remote narrative",
            sections: [{ heading: "Remote section", bullets: ["remote bullet"] }],
            followUps: ["Remote follow up"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )) as typeof fetch;

      try {
        const answer = await askAssistant(
          "What tasks are overdue?",
          workspace,
          "http://localhost:4000"
        );

        assert.equal(answer.source, "llm");
        assert.equal(answer.headline, "Remote headline");
        assert.equal(answer.narrative, "Remote narrative");
        assert.equal(answer.sections[0].heading, "Remote section");
        assert.equal(answer.followUps[0], "Remote follow up");
        assert.equal(answer.tasks.length, 1);
      } finally {
        globalThis.fetch = original;
      }
    },
  },
  {
    name: "service falls back to the local answer when the api fails",
    run: async () => {
      const original = globalThis.fetch;

      globalThis.fetch = (async () => {
        throw new Error("network down");
      }) as typeof fetch;

      try {
        const answer = await askAssistant("What tasks are overdue?", workspace, "http://localhost:4000");

        assert.equal(answer.source, "engine");
        assert.equal(answer.tasks.length, 1);
      } finally {
        globalThis.fetch = original;
      }
    },
  },
];

let failed = 0;

for (const check of checks) {
  try {
    await check.run();

    console.log(`  ok  ${check.name}`);
  } catch (error) {
    failed += 1;

    console.error(`FAIL  ${check.name}`);
    console.error(`      ${(error as Error).message.split("\n")[0]}`);
  }
}

console.log(`\n${checks.length - failed}/${checks.length} checks passed`);

if (failed > 0) {
  process.exitCode = 1;
}
