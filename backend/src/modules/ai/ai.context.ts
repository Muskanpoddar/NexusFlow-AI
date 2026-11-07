
import { prisma } from "../../lib/prisma.js";

export interface ProjectContext {
  id: string;
  name: string;
  status: string;
  priority: string;
  startDate: Date | null;
  dueDate: Date | null;
  ownerName: string;
  memberCount: number;
  totalTasks: number;
  openTasks: number;
  overdueTasks: number;
  completion: number;
}

export interface TaskContext {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  assigneeId: string | null;
  projectName: string;
  assigneeName: string | null;
  overdue: boolean;
}

export interface MemberContext {
  id: string;
  name: string;
  role: string;
  openTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
}

export interface WorkspaceContext {
  name: string;
  projects: ProjectContext[];
  tasks: TaskContext[];
  members: MemberContext[];
}

export async function getWorkspaceContext(
  workspaceId: string
): Promise<WorkspaceContext | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      name: true,
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
          priority: true,
          startDate: true,
          dueDate: true,
          owner: { select: { name: true } },
          members: { select: { userId: true } },
          tasks: { select: { status: true, dueDate: true } },
        },
      },
      memberships: {
        select: {
          role: true,
          user: { select: { id: true, name: true } },
        },
      },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assigneeId: true,
          project: { select: { name: true } },
          assignee: { select: { name: true } },
        },
      },
    },
  });

  if (!workspace) return null;

  const now = new Date();

  const tasks: TaskContext[] = workspace.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    assigneeId: task.assigneeId,
    projectName: task.project.name,
    assigneeName: task.assignee?.name ?? null,
    overdue:
      task.status !== "DONE" && task.dueDate !== null && task.dueDate < now,
  }));

  const projects: ProjectContext[] = workspace.projects.map((project) => {
    const total = project.tasks.length;
    const done = project.tasks.filter((task) => task.status === "DONE").length;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate,
      dueDate: project.dueDate,
      ownerName: project.owner.name,
      memberCount: project.members.length,
      totalTasks: total,
      openTasks: total - done,
      overdueTasks: project.tasks.filter(
        (task) => task.status !== "DONE" && task.dueDate !== null && task.dueDate < now
      ).length,
      completion: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  });

  const members: MemberContext[] = workspace.memberships.map((membership) => {
    const assigned = tasks.filter(
      (task) =>
        task.assigneeId === membership.user.id && task.status !== "DONE"
    );

    return {
      id: membership.user.id,
      name: membership.user.name,
      role: membership.role,
      openTasks: assigned.length,
      overdueTasks: assigned.filter((task) => task.overdue).length,
      highPriorityTasks: assigned.filter(
        (task) => task.priority === "HIGH" || task.priority === "URGENT"
      ).length,
    };
  });

  return {
    name: workspace.name,
    projects,
    tasks,
    members,
  };
}
