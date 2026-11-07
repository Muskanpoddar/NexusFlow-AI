
import { randomUUID, createHash, randomBytes } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { sendEmail } from "../../lib/mailer.js";
import { frontendUrl } from "../../lib/links.js";
import { createActivity } from "../activity/activity.service.js";
import type {
  CreateWorkspaceInput,
  AddWorkspaceMemberInput,
  UpdateWorkspaceMemberInput,
  CreateWorkspaceInvitationInput,
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

const INVITATION_TTL_HOURS = Number(
  process.env.INVITATION_TTL_HOURS ?? 72
);

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createWorkspaceInvitation(
  workspaceId: string,
  actorId: string,
  input: CreateWorkspaceInvitationInput
) {
  const actorRole = await requireWorkspaceManager(workspaceId, actorId);

  if (input.role === "ADMIN" && actorRole !== "OWNER") {
    throw new WorkspaceError(
      "Only the workspace owner can assign the ADMIN role",
      403
    );
  }

  const email = input.email.toLowerCase();

  const existingMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId, user: { email } },
    select: { id: true },
  });

  if (existingMember) {
    throw new WorkspaceError(
      "This person is already a workspace member",
      409
    );
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });

  if (!workspace) {
    throw new WorkspaceError("Workspace not found", 404);
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_HOURS * 3_600_000
  );

  // One open invitation per address, so a fresh invite replaces the old link.
  const invitation = await prisma.workspaceInvitation.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    update: {
      role: input.role,
      tokenHash: hashInvitationToken(token),
      expiresAt,
      acceptedAt: null,
      invitedById: actorId,
    },
    create: {
      workspaceId,
      email,
      role: input.role,
      tokenHash: hashInvitationToken(token),
      expiresAt,
      invitedById: actorId,
    },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const link = `${frontendUrl()}/?inviteToken=${token}`;

  const sent = await sendEmail(
    email,
    `You are invited to join ${workspace.name}`,
    `<p>You have been invited to join the workspace <strong>${workspace.name}</strong> on NexusFlow.</p><p><a href="${link}">Accept the invitation</a></p><p>The link works once and expires in ${INVITATION_TTL_HOURS} hours. If you have no account yet, create one with this email address first.</p>`
  );

  if (!sent) {
    // shortcut: no mailer is configured, so the link goes to the server log
    console.log(`[invitations] Invite link for ${email}: ${link}`);
  }

  await createActivity({
    workspaceId,
    actorId,
    type: "WORKSPACE_INVITATION_SENT",
    entityType: "WORKSPACE",
    entityId: workspaceId,
    description: `invited ${email} to the workspace`,
  });

  return { ...invitation, inviteLink: link, emailed: sent };
}

export async function listWorkspaceInvitations(
  workspaceId: string,
  actorId: string
) {
  await requireWorkspaceManager(workspaceId, actorId);

  return prisma.workspaceInvitation.findMany({
    where: { workspaceId, acceptedAt: null },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeWorkspaceInvitation(
  workspaceId: string,
  invitationId: string,
  actorId: string
) {
  await requireWorkspaceManager(workspaceId, actorId);

  const removed = await prisma.workspaceInvitation.deleteMany({
    where: { id: invitationId, workspaceId },
  });

  if (removed.count === 0) {
    throw new WorkspaceError("Invitation not found", 404);
  }

  return { revoked: true };
}

export async function acceptWorkspaceInvitation(
  token: string,
  userId: string
) {
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    select: {
      id: true,
      workspaceId: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      workspace: { select: { id: true, name: true } },
    },
  });

  if (!invitation) {
    throw new WorkspaceError(
      "This invitation is invalid or has expired",
      400
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user || user.email.toLowerCase() !== invitation.email) {
    throw new WorkspaceError(
      "This invitation was sent to a different email address",
      403
    );
  }

  if (invitation.acceptedAt) {
    // The invitation was already used, for example while the account was
    // created. The membership is still there.
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId,
        },
      },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!membership) {
      throw new WorkspaceError(
        "This invitation is invalid or has expired",
        400
      );
    }

    return {
      membership,
      workspace: invitation.workspace,
    };
  }

  if (invitation.expiresAt < new Date()) {
    throw new WorkspaceError(
      "This invitation is invalid or has expired",
      400
    );
  }

  const membership = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: invitation.workspaceId,
        userId,
      },
    },
    update: {},
    create: {
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role,
    },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await prisma.workspaceInvitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });

  await createActivity({
    workspaceId: invitation.workspaceId,
    actorId: userId,
    type: "WORKSPACE_MEMBER_ADDED",
    entityType: "WORKSPACE",
    entityId: invitation.workspaceId,
    description: `joined the workspace from an invitation`,
  });

  return {
    membership,
    workspace: invitation.workspace,
  };
}
