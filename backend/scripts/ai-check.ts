import assert from "node:assert/strict";

import type { WorkspaceContext } from "../src/modules/ai/ai.context.js";
import { buildMessages, buildSnapshot } from "../src/modules/ai/ai.prompts.js";
import { parseModelAnswer } from "../src/modules/ai/ai.provider.js";
import { chatSchema } from "../src/modules/ai/ai.validation.js";

const context: WorkspaceContext = {
  name: "NexusFlow",
  projects: [
    {
      id: "p1",
      name: "Alpha",
      status: "ACTIVE",
      priority: "HIGH",
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      dueDate: new Date("2026-10-20T00:00:00.000Z"),
      ownerName: "Ada Lovelace",
      memberCount: 2,
      totalTasks: 3,
      openTasks: 2,
      overdueTasks: 1,
      completion: 33,
    },
  ],
  tasks: [
    {
      id: "t1",
      title: "Ship v1",
      status: "DONE",
      priority: "HIGH",
      dueDate: new Date("2026-10-10T00:00:00.000Z"),
      assigneeId: "m1",
      projectName: "Alpha",
      assigneeName: "Ada Lovelace",
      overdue: false,
    },
    {
      id: "t2",
      title: "Fix login bug",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date("2026-10-25T00:00:00.000Z"),
      assigneeId: "m1",
      projectName: "Alpha",
      assigneeName: "Ada Lovelace",
      overdue: true,
    },
  ],
  members: [
    {
      id: "m1",
      name: "Ada Lovelace",
      role: "OWNER",
      openTasks: 1,
      overdueTasks: 1,
      highPriorityTasks: 1,
    },
  ],
};

const modelAnswer = JSON.stringify({
  intent: "project-health",
  headline: "Alpha is falling behind",
  narrative: "Alpha is 18% behind schedule.",
  sections: [{ heading: "Project health", bullets: ["Alpha: 33% complete"] }],
  followUps: ["What tasks are overdue?"],
});

const checks: { name: string; run: () => void }[] = [
  {
    name: "a chat request with a workspace and question is accepted",
    run: () => {
      const result = chatSchema.safeParse({
        workspaceId: "w1",
        question: "Which projects are falling behind?",
      });

      assert.equal(result.success, true);
    },
  },
  {
    name: "a blank question or missing workspace is rejected",
    run: () => {
      assert.equal(chatSchema.safeParse({ workspaceId: "w1", question: "  " }).success, false);
      assert.equal(chatSchema.safeParse({ question: "hello" }).success, false);
    },
  },
  {
    name: "a json answer becomes an assistant answer",
    run: () => {
      const answer = parseModelAnswer(modelAnswer);

      assert.equal(answer.intent, "project-health");
      assert.equal(answer.headline, "Alpha is falling behind");
      assert.equal(answer.narrative, "Alpha is 18% behind schedule.");
      assert.equal(answer.sections.length, 1);
      assert.equal(answer.sections[0].heading, "Project health");
      assert.equal(answer.followUps[0], "What tasks are overdue?");
    },
  },
  {
    name: "a fenced json answer is still parsed",
    run: () => {
      const answer = parseModelAnswer(`\`\`\`json\n${modelAnswer}\n\`\`\``);

      assert.equal(answer.intent, "project-health");
      assert.equal(answer.sections.length, 1);
    },
  },
  {
    name: "an answer with an unknown intent falls back to overview",
    run: () => {
      const answer = parseModelAnswer(
        JSON.stringify({ intent: "small-talk", headline: "Hi", narrative: "Hello" })
      );

      assert.equal(answer.intent, "overview");
      assert.equal(answer.headline, "Hi");
    },
  },
  {
    name: "plain text becomes the narrative",
    run: () => {
      const answer = parseModelAnswer("Alpha is behind schedule.");

      assert.equal(answer.narrative, "Alpha is behind schedule.");
      assert.equal(answer.headline, "Alpha is behind schedule.");
      assert.equal(answer.sections.length, 0);
    },
  },
  {
    name: "the snapshot carries the workspace facts",
    run: () => {
      const snapshot = buildSnapshot(context);

      assert.ok(snapshot.includes("Workspace: NexusFlow"));
      assert.ok(snapshot.includes("Alpha"));
      assert.ok(snapshot.includes("Fix login bug"));
      assert.ok(snapshot.includes("Ada Lovelace"));
    },
  },
  {
    name: "the prompt carries the system rules, the snapshot and the question",
    run: () => {
      const messages = buildMessages(context, "How is Alpha doing?", []);

      assert.equal(messages[0].role, "system");
      assert.equal(messages[messages.length - 1].role, "user");
      assert.ok(messages[messages.length - 1].content.includes("Alpha"));
      assert.ok(messages[messages.length - 1].content.includes("How is Alpha doing?"));
    },
  },
  {
    name: "the prompt keeps the conversation history",
    run: () => {
      const messages = buildMessages(context, "And Beta?", [
        { role: "user", content: "How is Alpha doing?" },
        { role: "assistant", content: "Alpha is behind schedule." },
      ]);

      assert.equal(messages.length, 4);
      assert.equal(messages[1].content, "How is Alpha doing?");
      assert.equal(messages[2].role, "assistant");
    },
  },
];

let failed = 0;

for (const check of checks) {
  try {
    check.run();

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
