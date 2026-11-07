
import { prisma } from "../../lib/prisma.js";
import { createActivity } from "../activity/activity.service.js";
import type {
  CreateTaskInput,
  UpdateTaskInput,
} from "./task.validation.js";

type WorkspaceRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";

export class TaskError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "TaskError";
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
    throw new TaskError("You do not have access to this workspace", 403);
  }

  return membership.role as WorkspaceRole;
}

async function requireTaskManager(workspaceId: string, userId: string) {
  const role = await requireWorkspaceMember(workspaceId, userId);

  if (!["OWNER", "ADMIN", "MANAGER"].includes(role)) {
    throw new TaskError("You do not have permission to manage tasks", 403);
  }

  return role;
}

async function requireProject(workspaceId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });

  if (!project) {
    throw new TaskError("Project not found in this workspace", 404);
  }
}

async function requireTask(
  workspaceId: string,
  projectId: string,
  taskId: string
) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, workspaceId, projectId },
  });

  if (!task) {
    throw new TaskError("Task not found", 404);
  }

  return task;
}

async function validateAssignee(
  workspaceId: string,
  projectId: string,
  assigneeId: string | null | undefined
) {
  if (assigneeId === undefined || assigneeId === null) {
    return;
  }

  const projectMembership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: assigneeId,
      },
    },
  });

  if (!projectMembership) {
    throw new TaskError("Assignee must be a member of this project", 400);
  }

  const workspaceMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: assigneeId,
      },
    },
  });

  if (!workspaceMembership) {
    throw new TaskError("Assignee must be a member of this workspace", 400);
  }
}

const taskRelations = {
  creator: {
    select: { id: true, name: true, email: true },
  },
  assignee: {
    select: { id: true, name: true, email: true },
  },
  project: {
    select: { id: true, name: true, status: true },
  },
};

export async function getProjectTasks(
  workspaceId: string,
  projectId: string,
  userId: string
) {
  await requireWorkspaceMember(workspaceId, userId);
  await requireProject(workspaceId, projectId);

  return prisma.task.findMany({
    where: { workspaceId, projectId },
    include: taskRelations,
    orderBy: { createdAt: "desc" },
  });
}

export async function getTaskById(
  workspaceId: string,
  projectId: string,
  taskId: string,
  userId: string
) {
  await requireWorkspaceMember(workspaceId, userId);
  await requireTask(workspaceId, projectId, taskId);

  return prisma.task.findFirst({
    where: { id: taskId, workspaceId, projectId },
    include: taskRelations,
  });
}

export async function createTask(
  workspaceId: string,
  projectId: string,
  userId: string,
  input: CreateTaskInput
) {
  await requireTaskManager(workspaceId, userId);
  await requireProject(workspaceId, projectId);

  await validateAssignee(workspaceId, projectId, input.assigneeId);

  const task = await prisma.task.create({
    data: {
      workspaceId,
      projectId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
      assigneeId: input.assigneeId,
      creatorId: userId,
    },
    include: taskRelations,
  });

  await createActivity({
    workspaceId,
    actorId: userId,
    type: "TASK_CREATED",
    entityType: "TASK",
    entityId: task.id,
    description: `created task "${task.title}" in project "${task.project.name}"`,
  });

  return task;
}

export async function updateTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  userId: string,
  input: UpdateTaskInput
) {
  await requireTaskManager(workspaceId, userId);

  const existingTask = await requireTask(workspaceId, projectId, taskId);

  if (input.assigneeId !== undefined) {
    await validateAssignee(workspaceId, projectId, input.assigneeId);
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: input,
    include: taskRelations,
  });

  const completed =
    input.status === "DONE" && existingTask.status !== "DONE";

  await createActivity({
    workspaceId,
    actorId: userId,
    type: completed ? "TASK_COMPLETED" : "TASK_UPDATED",
    entityType: "TASK",
    entityId: task.id,
    description: completed
      ? `completed task "${task.title}"`
      : `updated task "${task.title}"`,
  });

  return task;
}

export async function deleteTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  userId: string
) {
  const role = await requireWorkspaceMember(workspaceId, userId);

  if (role !== "OWNER" && role !== "ADMIN") {
    throw new TaskError(
      "Only workspace owners and admins can delete tasks",
      403
    );
  }

  const task = await requireTask(workspaceId, projectId, taskId);

  await prisma.task.delete({
    where: { id: taskId },
  });

  await createActivity({
    workspaceId,
    actorId: userId,
    type: "TASK_DELETED",
    entityType: "TASK",
    entityId: taskId,
    description: `deleted task "${task.title}"`,
  });

  return { taskId };
}
