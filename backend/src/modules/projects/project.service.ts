
import { prisma } from "../../lib/prisma.js";
import { createActivity } from "../activity/activity.service.js";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "./project.validation.js";

type WorkspaceRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";

export class ProjectError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "ProjectError";
  }
}

async function requireWorkspaceMember(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new ProjectError("You do not have access to this workspace", 403);
  }

  return membership.role as WorkspaceRole;
}

async function requireProjectManager(workspaceId: string, userId: string) {
  const role = await requireWorkspaceMember(workspaceId, userId);

  if (!["OWNER", "ADMIN", "MANAGER"].includes(role)) {
    throw new ProjectError("You do not have permission to manage projects", 403);
  }

  return role;
}

async function getProjectInWorkspace(workspaceId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });

  if (!project) {
    throw new ProjectError("Project not found", 404);
  }

  return project;
}

export async function getProjects(workspaceId: string, userId: string) {
  await requireWorkspaceMember(workspaceId, userId);

  return prisma.project.findMany({
    where: { workspaceId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: { tasks: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectById(
  workspaceId: string,
  projectId: string,
  userId: string
) {
  await requireWorkspaceMember(workspaceId, userId);
  await getProjectInWorkspace(workspaceId, projectId);

  return prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      tasks: true,
      _count: {
        select: { tasks: true },
      },
    },
  });
}

export async function createProject(
  workspaceId: string,
  userId: string,
  input: CreateProjectInput
) {
  await requireProjectManager(workspaceId, userId);

  if (input.startDate && input.dueDate && input.dueDate < input.startDate) {
    throw new ProjectError("Due date cannot be earlier than start date", 400);
  }

  const project = await prisma.project.create({
    data: {
      workspaceId,
      name: input.name,
      description: input.description,
      status: input.status,
      priority: input.priority,
      startDate: input.startDate,
      dueDate: input.dueDate,
      ownerId: userId,
      members: {
        create: { userId },
      },
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  await createActivity({
    workspaceId,
    actorId: userId,
    type: "PROJECT_CREATED",
    entityType: "PROJECT",
    entityId: project.id,
    description: `created project "${project.name}"`,
  });

  return project;
}

export async function updateProject(
  workspaceId: string,
  projectId: string,
  userId: string,
  input: UpdateProjectInput
) {
  await requireProjectManager(workspaceId, userId);

  const existingProject = await getProjectInWorkspace(workspaceId, projectId);

  const startDate =
    input.startDate !== undefined ? input.startDate : existingProject.startDate;

  const dueDate =
    input.dueDate !== undefined ? input.dueDate : existingProject.dueDate;

  if (startDate && dueDate && dueDate < startDate) {
    throw new ProjectError("Due date cannot be earlier than start date", 400);
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: input,
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  await createActivity({
    workspaceId,
    actorId: userId,
    type: "PROJECT_UPDATED",
    entityType: "PROJECT",
    entityId: project.id,
    description: `updated project "${project.name}"`,
  });

  return project;
}

export async function deleteProject(
  workspaceId: string,
  projectId: string,
  userId: string
) {
  const role = await requireWorkspaceMember(workspaceId, userId);

  if (role !== "OWNER" && role !== "ADMIN") {
    throw new ProjectError(
      "Only workspace owners and admins can delete projects",
      403
    );
  }

  const project = await getProjectInWorkspace(workspaceId, projectId);

  await prisma.project.delete({
    where: { id: projectId },
  });

  await createActivity({
    workspaceId,
    actorId: userId,
    type: "PROJECT_DELETED",
    entityType: "PROJECT",
    entityId: projectId,
    description: `deleted project "${project.name}"`,
  });

  return { projectId };
}

export async function addProjectMember(
  workspaceId: string,
  projectId: string,
  actorId: string,
  targetUserId: string
) {
  await requireProjectManager(workspaceId, actorId);
  const project = await getProjectInWorkspace(workspaceId, projectId);

  const workspaceMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUserId,
      },
    },
  });

  if (!workspaceMembership) {
    throw new ProjectError("This user is not a member of the workspace", 400);
  }

  const existing = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUserId,
      },
    },
  });

  if (existing) {
    throw new ProjectError("User is already assigned to this project", 409);
  }

  const membership = await prisma.projectMember.create({
    data: {
      projectId,
      userId: targetUserId,
    },
    select: {
      id: true,
      addedAt: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await createActivity({
    workspaceId,
    actorId,
    type: "PROJECT_MEMBER_ADDED",
    entityType: "PROJECT",
    entityId: projectId,
    description: `added ${membership.user.name} to project "${project.name}"`,
  });

  return membership;
}

export async function removeProjectMember(
  workspaceId: string,
  projectId: string,
  actorId: string,
  targetUserId: string
) {
  await requireProjectManager(workspaceId, actorId);

  const project = await getProjectInWorkspace(workspaceId, projectId);

  if (project.ownerId === targetUserId) {
    throw new ProjectError(
      "The project owner cannot be removed from the project",
      403
    );
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUserId,
      },
    },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  if (!membership) {
    throw new ProjectError("Project member not found", 404);
  }

  await prisma.projectMember.delete({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUserId,
      },
    },
  });

  await createActivity({
    workspaceId,
    actorId,
    type: "PROJECT_MEMBER_REMOVED",
    entityType: "PROJECT",
    entityId: projectId,
    description: `removed ${membership.user.name} from project "${project.name}"`,
  });

  return { userId: targetUserId };
}
