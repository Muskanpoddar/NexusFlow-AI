
import type { Project } from "../types/project";
import type { Task } from "../types/task";
import type { TeamMember } from "../types/team";

export function calculateProjectProgress(
  projectId: string,
  tasks: Task[]
): number {
  const projectTasks = tasks.filter(
    (task) => task.projectId === projectId
  );

  if (projectTasks.length === 0) return 0;

  const completed = projectTasks.filter(
    (task) => task.status === "Done"
  ).length;

  return Math.round((completed / projectTasks.length) * 100);
}

export function getDashboardMetrics(
  projects: Project[],
  tasks: Task[],
  members: TeamMember[]
) {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const overdueTasks = tasks.filter((task) => {
    if (task.status === "Done" || !task.dueDate) return false;

    const dueDate = new Date(`${task.dueDate}T00:00:00`);
    return dueDate < today;
  });

  const completedTasks = tasks.filter(
    (task) => task.status === "Done"
  );

  const activeTasks = tasks.filter(
    (task) => task.status === "In Progress"
  );

  const todoTasks = tasks.filter(
    (task) => task.status === "To Do"
  );

  const activeProjects = projects.filter(
    (project) => project.status === "Active"
  );

  return {
    totalProjects: projects.length,
    activeProjects: activeProjects.length,
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    activeTasks: activeTasks.length,
    todoTasks: todoTasks.length,
    overdueTasks: overdueTasks.length,
    totalMembers: members.length,
    completionRate:
      tasks.length === 0
        ? 0
        : Math.round((completedTasks.length / tasks.length) * 100),
  };
}

export function getMemberWorkload(
  memberId: string,
  tasks: Task[]
) {
  const assignedTasks = tasks.filter(
    (task) => task.assigneeId === memberId && task.status !== "Done"
  );

  return {
    total: assignedTasks.length,
    highPriority: assignedTasks.filter(
      (task) => task.priority === "High"
    ).length,
    overdue: assignedTasks.filter((task) => {
      if (!task.dueDate) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return new Date(`${task.dueDate}T00:00:00`) < today;
    }).length,
  };
}
