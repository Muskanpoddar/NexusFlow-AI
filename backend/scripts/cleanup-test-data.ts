import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

// Removes the throwaway accounts the check and smoke scripts create. The
// seeded accounts (test@nexusflow.dev, second@nexusflow.dev) and every real
// account are kept, because only these exact shapes are matched.
const TEST_ACCOUNTS = [
  /^ai-check-\d+@example\.com$/,
  /^ai-e2e-\d+@example\.com$/,
  /^ai-hist-\d+@example\.com$/,
  /^frontend\.check\.\d+@example\.com$/,
  /^smoke\d+@nexusflow\.test$/,
  /^(owner|acceptor|stranger|invitee|teammate)-\d+@example\.com$/,
];

const users = await prisma.user.findMany({
  select: { id: true, email: true },
});

const testUsers = users.filter((user) =>
  TEST_ACCOUNTS.some((pattern) => pattern.test(user.email))
);

if (testUsers.length === 0) {
  console.log("no test accounts left");
}

const userIds = testUsers.map((user) => user.id);

const workspaces = await prisma.workspace.findMany({
  select: {
    id: true,
    name: true,
    createdById: true,
    memberships: { select: { userId: true } },
  },
});

const testWorkspaces = workspaces.filter(
  (workspace) =>
    userIds.includes(workspace.createdById) ||
    workspace.memberships.some((membership) =>
      userIds.includes(membership.userId)
    )
);

const removedWorkspaces = await prisma.workspace.deleteMany({
  where: { id: { in: testWorkspaces.map((workspace) => workspace.id) } },
});

const removedUsers = await prisma.user.deleteMany({
  where: { id: { in: userIds } },
});

console.log(
  "removed:",
  removedWorkspaces.count,
  "workspaces,",
  removedUsers.count,
  "users"
);

console.log(
  "left:",
  (await prisma.user.count()),
  "users,",
  (await prisma.workspace.count()),
  "workspaces"
);

await prisma.$disconnect();
