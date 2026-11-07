import assert from "node:assert/strict";

import { ApiError, apiRequest } from "../src/services/api/apiClient.ts";
import {
  clearStoredSession,
  formatRole,
  loginUser,
  readStoredToken,
  registerUser,
  storeSession,
} from "../src/features/auth/authService.ts";

const storage = new Map<string, string>();

(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
} as Storage;

function stubFetch(payload: unknown, status = 200) {
  const calls: { url: string; options: RequestInit }[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = (async (url: string, options: RequestInit) => {
    calls.push({ url, options });

    return new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

const checks: { name: string; run: () => void | Promise<void> }[] = [
  {
    name: "a successful request returns the data payload",
    run: async () => {
      const stub = stubFetch({ success: true, data: { id: "u1" } });

      try {
        const result = await apiRequest<{ id: string }>("/api/auth/me");

        assert.deepEqual(result, { id: "u1" });
      } finally {
        stub.restore();
      }
    },
  },
  {
    name: "a failed request throws the server message",
    run: async () => {
      const stub = stubFetch(
        { success: false, message: "Invalid email or password" },
        401
      );

      try {
        await assert.rejects(
          () => apiRequest("/api/auth/login", { method: "POST" }),
          (error: unknown) => {
            assert.ok(error instanceof ApiError);
            assert.equal(error.status, 401);
            assert.equal(error.message, "Invalid email or password");

            return true;
          }
        );
      } finally {
        stub.restore();
      }
    },
  },
  {
    name: "the token is sent as a bearer header",
    run: async () => {
      const stub = stubFetch({ success: true, data: {} });

      try {
        await apiRequest("/api/auth/me", { token: "abc123" });

        const headers = stub.calls[0].options.headers as Record<string, string>;

        assert.equal(headers.Authorization, "Bearer abc123");
      } finally {
        stub.restore();
      }
    },
  },
  {
    name: "login maps the backend payload",
    run: async () => {
      const stub = stubFetch({
        success: true,
        data: {
          user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com" },
          workspaces: [
            { role: "OWNER", workspace: { id: "w1", name: "NexusFlow", slug: "nexusflow" } },
          ],
          accessToken: "token-1",
        },
      });

      try {
        const session = await loginUser({
          email: "ada@example.com",
          password: "password123",
        });

        assert.equal(session.accessToken, "token-1");
        assert.equal(session.user.name, "Ada Lovelace");
        assert.equal(session.workspaces[0].role, "OWNER");
      } finally {
        stub.restore();
      }
    },
  },
  {
    name: "register turns the new workspace into a membership",
    run: async () => {
      const stub = stubFetch({
        success: true,
        data: {
          user: { id: "u2", name: "Grace Hopper", email: "grace@example.com" },
          workspace: { id: "w2", name: "Grace's Workspace", slug: "workspace-2" },
          accessToken: "token-2",
        },
      });

      try {
        const session = await registerUser({
          name: "Grace Hopper",
          email: "grace@example.com",
          password: "password123",
        });

        assert.equal(session.accessToken, "token-2");
        assert.equal(session.workspaces.length, 1);
        assert.equal(session.workspaces[0].role, "OWNER");
        assert.equal(session.workspaces[0].workspace.name, "Grace's Workspace");
      } finally {
        stub.restore();
      }
    },
  },
  {
    name: "the session survives a page refresh",
    run: () => {
      storeSession("token-3", { id: "u3", name: "Alan Turing", email: "alan@example.com" });

      assert.equal(readStoredToken(), "token-3");

      clearStoredSession();

      assert.equal(readStoredToken(), null);
    },
  },
  {
    name: "workspace roles are humanised",
    run: () => {
      assert.equal(formatRole("OWNER"), "Workspace Owner");
      assert.equal(formatRole("ADMIN"), "Workspace Admin");
      assert.equal(formatRole("MEMBER"), "Member");
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
