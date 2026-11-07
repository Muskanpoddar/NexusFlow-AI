import "dotenv/config";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const owner = {
  name: "Integration Owner",
  email: `owner-${suffix}@example.com`,
  password: "OwnerPass123",
};
const teammate = {
  name: "Integration Teammate",
  email: `member-${suffix}@example.com`,
  password: "MemberPass123",
};

// A stub provider so the AI endpoint can be exercised without a real key.
const providerRequests: { messages: { role: string; content: string }[] }[] = [];

const provider = createServer((req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    providerRequests.push(JSON.parse(body));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "project-health",
                headline: "One project needs attention",
                narrative: "The integration project is behind its deadline.",
                sections: [
                  {
                    heading: "Risks",
                    bullets: ["Integration project is overdue"],
                  },
                ],
                followUps: ["Which tasks are overdue?"],
              }),
            },
          },
        ],
      })
    );
  });
});

await new Promise<void>((resolve) =>
  provider.listen(0, "127.0.0.1", resolve)
);

const providerPort = (provider.address() as AddressInfo).port;

// A stub mailer so the password reset delivery can be exercised.
const sentEmails: { to: string[]; body: string }[] = [];

const mailer = createServer((req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    const payload = JSON.parse(body) as { to: string[] };

    sentEmails.push({ to: payload.to, body });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: "stub-email" }));
  });
});

await new Promise<void>((resolve) =>
  mailer.listen(0, "127.0.0.1", resolve)
);

const mailerPort = (mailer.address() as AddressInfo).port;

process.env.MINIMAX_API_KEY = "integration-test-key";
process.env.MINIMAX_API_URL = `http://127.0.0.1:${providerPort}/v1`;

const api = createServer(app);

await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));

const base = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;

interface ApiResult<T> {
  status: number;
  body: { success: boolean; message?: string; data?: T };
}

async function call<T = Record<string, unknown>>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  } = {}
): Promise<ApiResult<T>> {
  const response = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  return { status: response.status, body: (await response.json()) as never };
}

const checks: { name: string; run: () => Promise<void> }[] = [];
let ownerToken = "";
let workspaceId = "";
let projectId = "";
let taskId = "";
let teammateId = "";
let ownerId = "";
let teammateWorkspaceId = "";
let strangerId = "";
let strangerWorkspaceId = "";
let extraWorkspaceId = "";

function check(name: string, run: () => Promise<void>) {
  checks.push({ name, run });
}

check("registration creates an account, a workspace and a token", async () => {
  const result = await call<{
    user: { id: string; name: string };
    workspace: { id: string };
    accessToken: string;
  }>("/api/auth/register", { method: "POST", body: owner });

  assert.equal(result.status, 201);
  assert.equal(result.body.success, true);
  assert.ok(result.body.data?.accessToken);

  ownerToken = result.body.data!.accessToken;
  workspaceId = result.body.data!.workspace.id;
  ownerId = result.body.data!.user.id;

  const second = await call<{
    user: { id: string };
    workspace: { id: string };
    accessToken: string;
  }>("/api/auth/register", { method: "POST", body: teammate });

  assert.equal(second.status, 201);

  teammateId = second.body.data!.user.id;
  teammateWorkspaceId = second.body.data!.workspace.id;
});

check("login returns the memberships of the user", async () => {
  const result = await call<{
    workspaces: { role: string; workspace: { id: string } }[];
  }>("/api/auth/login", {
    method: "POST",
    body: { email: owner.email, password: owner.password },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.data!.workspaces[0].role, "OWNER");
  assert.equal(result.body.data!.workspaces[0].workspace.id, workspaceId);

  const me = await call<{ memberships: unknown[] }>("/api/auth/me", {
    token: ownerToken,
  });

  assert.equal(me.status, 200);
  assert.equal(me.body.data!.memberships.length, 1);
});

check("a workspace can be created and the creator becomes its owner", async () => {
  const created = await call<{
    id: string;
    name: string;
    memberships: { role: string }[];
  }>("/api/workspaces", {
    method: "POST",
    token: ownerToken,
    body: { name: "Integration second workspace" },
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.data!.name, "Integration second workspace");
  assert.equal(created.body.data!.memberships[0].role, "OWNER");

  extraWorkspaceId = created.body.data!.id;

  const listed = await call<{ workspace: { id: string } }[]>(
    "/api/workspaces",
    { token: ownerToken }
  );

  assert.equal(listed.status, 200);
  assert.ok(
    listed.body.data!.some(
      (entry) => entry.workspace.id === extraWorkspaceId
    )
  );
});

check("the profile can be updated", async () => {
  const result = await call<{ name: string }>("/api/auth/me", {
    method: "PATCH",
    token: ownerToken,
    body: { name: "Integration Owner Renamed" },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.data!.name, "Integration Owner Renamed");
});

check("the password can be changed and the old one stops working", async () => {
  const wrong = await call("/api/auth/change-password", {
    method: "POST",
    token: ownerToken,
    body: {
      currentPassword: "not-the-password",
      newPassword: "NewOwnerPass123",
    },
  });

  assert.equal(wrong.status, 400);

  const changed = await call("/api/auth/change-password", {
    method: "POST",
    token: ownerToken,
    body: {
      currentPassword: owner.password,
      newPassword: "NewOwnerPass123",
    },
  });

  assert.equal(changed.status, 200);

  const stale = await call("/api/auth/login", {
    method: "POST",
    body: { email: owner.email, password: owner.password },
  });

  assert.equal(stale.status, 401);

  const fresh = await call<{ accessToken: string }>("/api/auth/login", {
    method: "POST",
    body: { email: owner.email, password: "NewOwnerPass123" },
  });

  assert.equal(fresh.status, 200);

  ownerToken = fresh.body.data!.accessToken;
});

check("a reset link can be requested and used exactly once", async () => {
  const logs: string[] = [];
  const originalLog = console.log;

  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };

  const requested = await call("/api/auth/forgot-password", {
    method: "POST",
    body: { email: owner.email },
  });

  console.log = originalLog;

  assert.equal(requested.status, 200);

  const line = logs.find((entry) => entry.includes("resetToken="));
  assert.ok(line, "the reset link is logged");

  const token = new URL(line.slice(line.indexOf("http"))).searchParams.get(
    "resetToken"
  );

  assert.ok(token);

  const reset = await call("/api/auth/reset-password", {
    method: "POST",
    body: { token, newPassword: "ResetOwnerPass123" },
  });

  assert.equal(reset.status, 200);

  const reused = await call("/api/auth/reset-password", {
    method: "POST",
    body: { token, newPassword: "AnotherPass123" },
  });

  assert.equal(reused.status, 400);

  const login = await call<{ accessToken: string }>("/api/auth/login", {
    method: "POST",
    body: { email: owner.email, password: "ResetOwnerPass123" },
  });

  assert.equal(login.status, 200);

  ownerToken = login.body.data!.accessToken;
});

check("an unknown email gets the same reset answer", async () => {
  const result = await call("/api/auth/forgot-password", {
    method: "POST",
    body: { email: `nobody-${suffix}@example.com` },
  });

  assert.equal(result.status, 200);
  assert.match(result.body.message ?? "", /If an account exists/);
});

check("the reset link is delivered by email when a mailer is configured", async () => {
  process.env.RESEND_API_KEY = "integration-test-key";
  process.env.RESEND_API_URL = `http://127.0.0.1:${mailerPort}/emails`;

  const result = await call("/api/auth/forgot-password", {
    method: "POST",
    body: { email: teammate.email },
  });

  assert.equal(result.status, 200);
  assert.equal(sentEmails.length, 1);
  assert.deepEqual(sentEmails[0].to, [teammate.email]);
  assert.match(sentEmails[0].body, /resetToken=/);

  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_URL;
});

check("projects can be created, listed, updated and deleted", async () => {
  const created = await call<{ id: string; ownerId: string }>(
    `/api/projects/workspaces/${workspaceId}`,
    {
      method: "POST",
      token: ownerToken,
      body: {
        name: "Integration project",
        description: "Created by the integration check",
        status: "ACTIVE",
        priority: "HIGH",
        startDate: "2026-10-01",
        dueDate: "2026-12-20",
      },
    }
  );

  assert.equal(created.status, 201);

  projectId = created.body.data!.id;

  const listed = await call<{ id: string }[]>(
    `/api/projects/workspaces/${workspaceId}`,
    { token: ownerToken }
  );

  assert.equal(listed.status, 200);
  assert.equal(listed.body.data!.length, 1);
  assert.equal(listed.body.data![0].id, projectId);

  const updated = await call<{ name: string }>(
    `/api/projects/workspaces/${workspaceId}/${projectId}`,
    {
      method: "PATCH",
      token: ownerToken,
      body: { name: "Integration project renamed" },
    }
  );

  assert.equal(updated.status, 200);
  assert.equal(updated.body.data!.name, "Integration project renamed");
});

check("tasks can be created, listed, updated and deleted", async () => {
  const created = await call<{ id: string; status: string }>(
    `/api/tasks/workspaces/${workspaceId}/projects/${projectId}`,
    {
      method: "POST",
      token: ownerToken,
      body: {
        title: "Integration task",
        description: "Created by the integration check",
        priority: "HIGH",
        dueDate: "2026-10-10",
      },
    }
  );

  assert.equal(created.status, 201);

  taskId = created.body.data!.id;

  const listed = await call<{ id: string }[]>(
    `/api/tasks/workspaces/${workspaceId}/projects/${projectId}`,
    { token: ownerToken }
  );

  assert.equal(listed.status, 200);
  assert.equal(listed.body.data!.length, 1);

  const updated = await call<{ status: string }>(
    `/api/tasks/workspaces/${workspaceId}/projects/${projectId}/${taskId}`,
    {
      method: "PATCH",
      token: ownerToken,
      body: { status: "DONE" },
    }
  );

  assert.equal(updated.status, 200);
  assert.equal(updated.body.data!.status, "DONE");
});

check("workspace members can be invited, promoted and removed", async () => {
  const added = await call<{ user: { id: string }; role: string }>(
    `/api/workspaces/${workspaceId}/members`,
    {
      method: "POST",
      token: ownerToken,
      body: { email: teammate.email, role: "MEMBER" },
    }
  );

  assert.equal(added.status, 201);
  assert.equal(added.body.data!.role, "MEMBER");

  const unknown = await call(`/api/workspaces/${workspaceId}/members`, {
    method: "POST",
    token: ownerToken,
    body: { email: `ghost-${suffix}@example.com`, role: "MEMBER" },
  });

  assert.equal(unknown.status, 404);

  const members = await call<{ user: { id: string } }[]>(
    `/api/workspaces/${workspaceId}/members`,
    { token: ownerToken }
  );

  assert.equal(members.status, 200);
  assert.equal(members.body.data!.length, 2);

  const promoted = await call<{ role: string }>(
    `/api/workspaces/${workspaceId}/members/${teammateId}`,
    {
      method: "PATCH",
      token: ownerToken,
      body: { role: "MANAGER" },
    }
  );

  assert.equal(promoted.status, 200);
  assert.equal(promoted.body.data!.role, "MANAGER");
});

check("a member can be attached to and detached from a project", async () => {
  const added = await call(
    `/api/projects/workspaces/${workspaceId}/${projectId}/members`,
    {
      method: "POST",
      token: ownerToken,
      body: { userId: teammateId },
    }
  );

  assert.equal(added.status, 201);

  const removed = await call(
    `/api/projects/workspaces/${workspaceId}/${projectId}/members/${teammateId}`,
    { method: "DELETE", token: ownerToken }
  );

  assert.equal(removed.status, 200);
});

check("the owner cannot be detached from their own project", async () => {
  const result = await call(
    `/api/projects/workspaces/${workspaceId}/${projectId}/members/${ownerId}`,
    { method: "DELETE", token: ownerToken }
  );

  assert.notEqual(result.status, 200);
});

check("the activity feed records what happened", async () => {
  const result = await call<{ type: string; description: string }[]>(
    `/api/activities/workspaces/${workspaceId}?page=1&limit=50`,
    { token: ownerToken }
  );

  assert.equal(result.status, 200);

  const types = result.body.data!.map((entry) => entry.type);

  assert.ok(types.includes("PROJECT_CREATED"));
  assert.ok(types.includes("TASK_CREATED"));
  assert.ok(types.includes("TASK_COMPLETED"));
  assert.ok(types.includes("WORKSPACE_MEMBER_ADDED"));
  assert.ok(types.includes("WORKSPACE_MEMBER_ROLE_UPDATED"));

  assert.ok(
    result.body.data!.every((entry) => entry.description.length > 0)
  );
});

check("the assistant answers with the workspace context and stores the chat", async () => {
  // A live task proves the snapshot the model receives is the current one.
  const openTask = await call<{ id: string }>(
    `/api/tasks/workspaces/${workspaceId}/projects/${projectId}`,
    {
      method: "POST",
      token: ownerToken,
      body: { title: "AI context task", priority: "MEDIUM" },
    }
  );

  assert.equal(openTask.status, 201);

  const answer = await call<{
    headline: string;
    source: string;
    conversationId: string;
  }>("/api/ai/chat", {
    method: "POST",
    token: ownerToken,
    body: {
      workspaceId,
      question: "How is the integration project doing?",
    },
  });

  assert.equal(answer.status, 200);
  assert.equal(answer.body.data!.headline, "One project needs attention");
  assert.equal(answer.body.data!.source, "llm");
  assert.ok(answer.body.data!.conversationId);

  const prompt = providerRequests.at(-1)?.messages.at(-1)?.content ?? "";

  assert.match(prompt, /Integration project renamed/);
  assert.match(prompt, /AI context task/);
  assert.match(prompt, /Integration Owner/);

  const conversations = await call<{ id: string }[]>(
    `/api/ai/workspaces/${workspaceId}/conversations`,
    { token: ownerToken }
  );

  assert.equal(conversations.status, 200);
  assert.equal(conversations.body.data!.length, 1);

  const messages = await call<{ role: string; content: string }[]>(
    `/api/ai/conversations/${answer.body.data!.conversationId}/messages`,
    { token: ownerToken }
  );

  assert.equal(messages.status, 200);
  assert.equal(messages.body.data!.length, 2);
  assert.equal(messages.body.data![0].role, "USER");
  assert.equal(messages.body.data![1].role, "ASSISTANT");
});

check("the assistant answers from the workspace context without a provider key", async () => {
  const providerKey = process.env.MINIMAX_API_KEY;

  delete process.env.MINIMAX_API_KEY;

  try {
    const answer = await call<{
      headline: string;
      source: string;
      conversationId: string;
    }>("/api/ai/chat", {
      method: "POST",
      token: ownerToken,
      body: {
        workspaceId,
        question: "What is overdue in this workspace?",
      },
    });

    assert.equal(answer.status, 200);
    assert.equal(answer.body.data!.source, "engine");
    assert.match(answer.body.data!.headline, /overdue/);
    assert.ok(answer.body.data!.conversationId);

    const conversations = await call<{ id: string }[]>(
      `/api/ai/workspaces/${workspaceId}/conversations`,
      { token: ownerToken }
    );

    assert.equal(conversations.body.data!.length, 2);
  } finally {
    process.env.MINIMAX_API_KEY = providerKey;
  }
});

check("the assistant refuses a workspace the caller does not belong to", async () => {
  const other = await call<{
    user: { id: string };
    workspace: { id: string };
    accessToken: string;
  }>("/api/auth/register", {
    method: "POST",
    body: {
      name: "Integration Stranger",
      email: `stranger-${suffix}@example.com`,
      password: "StrangerPass123",
    },
  });

  const result = await call("/api/ai/chat", {
    method: "POST",
    token: other.body.data!.accessToken,
    body: { workspaceId, question: "What is going on?" },
  });

  assert.equal(result.status, 403);

  strangerId = other.body.data!.user.id;
  strangerWorkspaceId = other.body.data!.workspace.id;
});

check("tasks and projects are removed cleanly", async () => {
  const deletedTask = await call(
    `/api/tasks/workspaces/${workspaceId}/projects/${projectId}/${taskId}`,
    { method: "DELETE", token: ownerToken }
  );

  assert.equal(deletedTask.status, 200);

  const deletedProject = await call(
    `/api/projects/workspaces/${workspaceId}/${projectId}`,
    { method: "DELETE", token: ownerToken }
  );

  assert.equal(deletedProject.status, 200);

  const listed = await call<unknown[]>(
    `/api/projects/workspaces/${workspaceId}`,
    { token: ownerToken }
  );

  assert.equal(listed.body.data!.length, 0);
});

check("a member can be removed from the workspace", async () => {
  const result = await call(
    `/api/workspaces/${workspaceId}/members/${teammateId}`,
    { method: "DELETE", token: ownerToken }
  );

  assert.equal(result.status, 200);

  const members = await call<unknown[]>(
    `/api/workspaces/${workspaceId}/members`,
    { token: ownerToken }
  );

  assert.equal(members.body.data!.length, 1);
});

let failed = 0;

for (const item of checks) {
  try {
    await item.run();

    console.log(`  ok  ${item.name}`);
  } catch (error) {
    failed += 1;

    console.error(`FAIL  ${item.name}`);
    console.error(`      ${(error as Error).message.split("\n")[0]}`);
  }
}

// Clean up exactly the rows this run created.
await prisma.workspace.deleteMany({
  where: {
    id: {
      in: [
        workspaceId,
        teammateWorkspaceId,
        strangerWorkspaceId,
        extraWorkspaceId,
      ],
    },
  },
});

await prisma.user.deleteMany({
  where: { id: { in: [ownerId, teammateId, strangerId] } },
});

await new Promise<void>((resolve) => api.close(() => resolve()));
await new Promise<void>((resolve) => provider.close(() => resolve()));
await new Promise<void>((resolve) => mailer.close(() => resolve()));
await prisma.$disconnect();

console.log(`\n${checks.length - failed}/${checks.length} checks passed`);

if (failed > 0) {
  process.exitCode = 1;
}
