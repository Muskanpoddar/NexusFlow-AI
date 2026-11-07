
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { createActivity } from "../activity/activity.service.js";
import type {
  CreateWorkspaceInput,
  AddWorkspaceMemberInput,
  UpdateWorkspaceMemberInput,
} from "./workspace.validation.js";

type WorkspaceRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";

export class WorkspaceError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "WorkspaceError";
  }
}

async function requireWorkspaceAccess(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new WorkspaceError("You are not a member of this workspace", 403);
  }

  return membership.role as WorkspaceRole;
}

async function requireWorkspaceManager(workspaceId: string, userId: string) {
  const role = await requireWorkspaceAccess(workspaceId, userId);

  if (role !== "OWNER" && role !== "ADMIN") {
    throw new WorkspaceError(
      "You do not have permission to manage workspace members",
      403
    );
  }

  return role;
}

export async function getUserWorkspaces(userId: string) {
  return prisma.workspaceMember.findMany({
    where: { userId },
    select: {
      role: true,
      joinedAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
}

export async function createWorkspace(
  userId: string,
  input: CreateWorkspaceInput
) {
  const slug = `workspace-${randomUUID()}`;

  const workspace = await prisma.workspace.create({
    data: {
      name: input.name,
      slug,
      createdById: userId,
      memberships: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      memberships: {
        select: {
          userId: true,
          role: true,
          joinedAt: true,
        },
      },
    },
  });

  await createActivity({
    workspaceId: workspace.id,
    actorId: userId,
    type: "WORKSPACE_CREATED",
    entityType: "WORKSPACE",
    entityId: workspace.id,
    description: `created workspace "${workspace.name}"`,
  });

  return workspace;
}

export async function getWorkspaceMembers(
  workspaceId: string,
  userId: string
) {
  await requireWorkspaceAccess(workspaceId, userId);

  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: {
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
}

export async function addWorkspaceMember(
  workspaceId: string,
  actorId: string,
  input: AddWorkspaceMemberInput
) {
  const actorRole = await requireWorkspaceManager(workspaceId, actorId);

  if (input.role === "ADMIN" && actorRole !== "OWNER") {
    throw new WorkspaceError(
      "Only the workspace owner can assign the ADMIN role",
      403
    );
  }

  const email = input.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new WorkspaceError(
      "No registered user found with this email",
      404
    );
  }

  const existingMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id,
      },
    },
  });

  if (existingMembership) {
    throw new WorkspaceError(
      "This user is already a workspace member",
      409
    );
  }

  const membership = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: user.id,
      role: input.role,
    },
    select: {
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  await createActivity({
    workspaceId,
    actorId,
    type: "WORKSPACE_MEMBER_ADDED",
    entityType: "WORKSPACE",
    entityId: workspaceId,
    description: `added ${membership.user.name} to the workspace`,
  });

  return membership;
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  targetUserId: string,
  actorId: string,
  input: UpdateWorkspaceMemberInput
) {
  const actorRole = await requireWorkspaceManager(workspaceId, actorId);

  const target = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUserId,
      },
    },
    select: {
      role: true,
      user: {
        select: { name: true },
      },
    },
  });

  if (!target) {
    throw new WorkspaceError("Workspace member not found", 404);
  }

  if (target.role === "OWNER") {
    throw new WorkspaceError(
      "The workspace owner role cannot be changed",
      403
    );
  }

  if (
    (target.role === "ADMIN" || input.role === "ADMIN") &&
    actorRole !== "OWNER"
  ) {
    throw new WorkspaceError(
      "Only the workspace owner can manage ADMIN roles",
      403
    );
  }

  const membership = await prisma.workspaceMember.update({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUserId,
      },
    },
    data: {
      role: input.role,
    },
    select: {
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  await createActivity({
    workspaceId,
    actorId,
    type: "WORKSPACE_MEMBER_ROLE_UPDATED",
    entityType: "WORKSPACE",
    entityId: workspaceId,
    description: `changed ${target.user.name}'s role from ${target.role} to ${input.role}`,
  });

  return membership;
}

export async function removeWorkspaceMember(
  workspaceId: string,
  targetUserId: string,
  actorId: string
) {
  const actorRole = await requireWorkspaceManager(workspaceId, actorId);

  const target = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUserId,
      },
    },
    select: {
      role: true,
      user: {
        select: { name: true },
      },
    },
  });

  if (!target) {
    throw new WorkspaceError("Workspace member not found", 404);
  }

  if (target.role === "OWNER") {
    throw new WorkspaceError("The workspace owner cannot be removed", 403);
  }

  if (target.role === "ADMIN" && actorRole !== "OWNER") {
    throw new WorkspaceError(
      "Only the workspace owner can remove an ADMIN",
      403
    );
  }

  await prisma.workspaceMember.delete({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUserId,
      },
    },
  });

  await createActivity({
    workspaceId,
    actorId,
    type: "WORKSPACE_MEMBER_REMOVED",
    entityType: "WORKSPACE",
    entityId: workspaceId,
    description: `removed ${target.user.name} from the workspace`,
  });

  return { userId: targetUserId };
}
