
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Project } from "../types/project";
import type { Task } from "../types/task";
import type { TeamMember } from "../types/team";
import type { Activity, ActivityType } from "../types/activity";

const STORAGE_KEY = "nexusflow-workspace-v1";
const WORKSPACE_ID = "workspace-demo";
const CURRENT_USER_ID = "member-1";

export interface WorkspaceData {
  projects: Project[];
  tasks: Task[];
  members: TeamMember[];
  activities: Activity[];
}

export interface WorkspaceContextValue extends WorkspaceData {
  createProject: (
    data: Omit<Project, "id" | "createdAt" | "workspaceId">
  ) => void;
  updateProject: (
    id: string,
    data: Partial<Omit<Project, "id" | "workspaceId">>
  ) => void;
  deleteProject: (id: string) => void;

  createTask: (
    data: Omit<Task, "id" | "createdAt" | "workspaceId">
  ) => void;
  updateTask: (
    id: string,
    data: Partial<Omit<Task, "id" | "workspaceId">>
  ) => void;
  deleteTask: (id: string) => void;

  createMember: (
    data: Omit<TeamMember, "id" | "joinedAt" | "workspaceId">
  ) => void;
  updateMember: (
    id: string,
    data: Partial<Omit<TeamMember, "id" | "workspaceId">>
  ) => void;
  deleteMember: (id: string) => void;

  assignMemberToProject: (projectId: string, memberId: string) => void;
  removeMemberFromProject: (projectId: string, memberId: string) => void;

  getProjectProgress: (projectId: string) => number;
  getProjectTasks: (projectId: string) => Task[];
  getProjectMembers: (projectId: string) => TeamMember[];
  getMemberProjects: (memberId: string) => Project[];
}

export const WorkspaceContext =
  createContext<WorkspaceContextValue | null>(null);

const initialData: WorkspaceData = {
  projects: [
    {
      id: "project-1",
      workspaceId: WORKSPACE_ID,
      name: "NexusFlow Dashboard",
      description: "Build the core project management dashboard.",
      status: "Active",
      priority: "High",
      ownerId: "member-1",
      memberIds: ["member-1", "member-2"],
      category: "Development",
      startDate: "2026-10-01",
      dueDate: "2026-12-15",
      createdAt: "2026-10-01T09:00:00.000Z",
    },
    {
      id: "project-2",
      workspaceId: WORKSPACE_ID,
      name: "Mobile App Development",
      description: "Develop the mobile experience.",
      status: "Planning",
      priority: "Medium",
      ownerId: "member-1",
      memberIds: ["member-1", "member-3"],
      category: "Mobile",
      startDate: "2026-10-15",
      dueDate: "2027-01-20",
      createdAt: "2026-10-15T09:00:00.000Z",
    },
    {
      id: "project-3",
      workspaceId: WORKSPACE_ID,
      name: "Website Redesign",
      description: "Refresh the public website experience.",
      status: "Active",
      priority: "Medium",
      ownerId: "member-2",
      memberIds: ["member-2", "member-4"],
      category: "Design",
      startDate: "2026-09-20",
      dueDate: "2026-12-05",
      createdAt: "2026-09-20T09:00:00.000Z",
    },
    {
      id: "project-4",
      workspaceId: WORKSPACE_ID,
      name: "AI Integration",
      description: "Integrate AI capabilities into the workspace.",
      status: "Planning",
      priority: "High",
      ownerId: "member-1",
      memberIds: ["member-1", "member-3"],
      category: "AI",
      startDate: "2026-11-01",
      dueDate: "2027-02-01",
      createdAt: "2026-11-01T09:00:00.000Z",
    },
  ],

  members: [
    {
      id: "member-1",
      workspaceId: WORKSPACE_ID,
      name: "Muskan Poddar",
      email: "muskan@example.com",
      role: "Admin",
      department: "Engineering",
      joinedAt: "Jan 2026",
    },
    {
      id: "member-2",
      workspaceId: WORKSPACE_ID,
      name: "Komal Sharma",
      email: "komal@example.com",
      role: "Manager",
      department: "Product",
      joinedAt: "Feb 2026",
    },
    {
      id: "member-3",
      workspaceId: WORKSPACE_ID,
      name: "Rahul Kumar",
      email: "rahul@example.com",
      role: "Member",
      department: "Engineering",
      joinedAt: "Mar 2026",
    },
    {
      id: "member-4",
      workspaceId: WORKSPACE_ID,
      name: "Ananya Singh",
      email: "ananya@example.com",
      role: "Member",
      department: "Design",
      joinedAt: "Mar 2026",
    },
  ],

  tasks: [
    {
      id: "task-1",
      workspaceId: WORKSPACE_ID,
      projectId: "project-1",
      title: "Design dashboard layout",
      description: "Create the main dashboard layout and responsive states.",
      status: "Done",
      priority: "High",
      assigneeId: "member-1",
      dueDate: "2026-11-10",
      createdAt: "2026-10-05T09:00:00.000Z",
    },
    {
      id: "task-2",
      workspaceId: WORKSPACE_ID,
      projectId: "project-1",
      title: "Implement analytics cards",
      description: "Build dynamic dashboard metric cards.",
      status: "In Progress",
      priority: "High",
      assigneeId: "member-2",
      dueDate: "2026-11-15",
      createdAt: "2026-10-06T09:00:00.000Z",
    },
    {
      id: "task-3",
      workspaceId: WORKSPACE_ID,
      projectId: "project-1",
      title: "Add activity timeline",
      description: "Display recent workspace activity.",
      status: "To Do",
      priority: "Medium",
      assigneeId: "member-1",
      dueDate: "2026-11-20",
      createdAt: "2026-10-07T09:00:00.000Z",
    },
    {
      id: "task-4",
      workspaceId: WORKSPACE_ID,
      projectId: "project-2",
      title: "Define mobile navigation",
      description: "Plan the navigation structure for mobile.",
      status: "To Do",
      priority: "Medium",
      assigneeId: "member-3",
      dueDate: "2026-12-01",
      createdAt: "2026-10-16T09:00:00.000Z",
    },
    {
      id: "task-5",
      workspaceId: WORKSPACE_ID,
      projectId: "project-3",
      title: "Create design system",
      description: "Define typography, spacing and color tokens.",
      status: "In Progress",
      priority: "High",
      assigneeId: "member-4",
      dueDate: "2026-11-25",
      createdAt: "2026-09-22T09:00:00.000Z",
    },
  ],

  activities: [],
};

function makeId() {
  return crypto.randomUUID();
}

function makeActivity(
  type: ActivityType,
  message: string,
  entityId: string
): Activity {
  return {
    id: makeId(),
    workspaceId: WORKSPACE_ID,
    type,
    message,
    actorId: CURRENT_USER_ID,
    entityId,
    createdAt: new Date().toISOString(),
  };
}

function loadWorkspace(): WorkspaceData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved) as WorkspaceData;

      if (
        Array.isArray(parsed.projects) &&
        Array.isArray(parsed.tasks) &&
        Array.isArray(parsed.members) &&
        Array.isArray(parsed.activities)
      ) {
        return parsed;
      }
    }
  } catch {
    console.warn("Could not load saved workspace data.");
  }

  return initialData;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkspaceData>(loadWorkspace);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      console.error("Could not save workspace data.");
    }
  }, [data]);

  const createProject = useCallback(
    (input: Omit<Project, "id" | "createdAt" | "workspaceId">) => {
      const project: Project = {
        ...input,
        id: makeId(),
        workspaceId: WORKSPACE_ID,
        createdAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        projects: [project, ...current.projects],
        activities: [
          makeActivity("PROJECT_CREATED", `Created project ${project.name}`, project.id),
          ...current.activities,
        ],
      }));
    },
    []
  );

  const updateProject = useCallback(
    (id: string, input: Partial<Omit<Project, "id" | "workspaceId">>) => {
      setData((current) => {
        const existing = current.projects.find((item) => item.id === id);
        if (!existing) return current;

        const updated = { ...existing, ...input };

        return {
          ...current,
          projects: current.projects.map((item) =>
            item.id === id ? updated : item
          ),
          activities: [
            makeActivity("PROJECT_UPDATED", `Updated project ${updated.name}`, id),
            ...current.activities,
          ],
        };
      });
    },
    []
  );

  const deleteProject = useCallback((id: string) => {
    setData((current) => {
      const project = current.projects.find((item) => item.id === id);
      if (!project) return current;

      return {
        ...current,
        projects: current.projects.filter((item) => item.id !== id),
        tasks: current.tasks.filter((task) => task.projectId !== id),
        activities: [
          makeActivity("PROJECT_DELETED", `Deleted project ${project.name}`, id),
          ...current.activities,
        ],
      };
    });
  }, []);

  const createTask = useCallback(
    (input: Omit<Task, "id" | "createdAt" | "workspaceId">) => {
      const task: Task = {
        ...input,
        id: makeId(),
        workspaceId: WORKSPACE_ID,
        createdAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        tasks: [task, ...current.tasks],
        activities: [
          makeActivity("TASK_CREATED", `Created task ${task.title}`, task.id),
          ...current.activities,
        ],
      }));
    },
    []
  );

  const updateTask = useCallback(
    (id: string, input: Partial<Omit<Task, "id" | "workspaceId">>) => {
      setData((current) => {
        const existing = current.tasks.find((item) => item.id === id);
        if (!existing) return current;

        const updated = { ...existing, ...input };
        const completedNow =
          existing.status !== "Done" && updated.status === "Done";

        return {
          ...current,
          tasks: current.tasks.map((item) =>
            item.id === id ? updated : item
          ),
          activities: [
            makeActivity(
              completedNow ? "TASK_COMPLETED" : "TASK_UPDATED",
              completedNow ? `Completed ${updated.title}` : `Updated ${updated.title}`,
              id
            ),
            ...current.activities,
          ],
        };
      });
    },
    []
  );

  const deleteTask = useCallback((id: string) => {
    setData((current) => {
      const task = current.tasks.find((item) => item.id === id);
      if (!task) return current;

      return {
        ...current,
        tasks: current.tasks.filter((item) => item.id !== id),
        activities: [
          makeActivity("TASK_DELETED", `Deleted task ${task.title}`, id),
          ...current.activities,
        ],
      };
    });
  }, []);

  const createMember = useCallback(
    (input: Omit<TeamMember, "id" | "joinedAt" | "workspaceId">) => {
      const member: TeamMember = {
        ...input,
        id: makeId(),
        workspaceId: WORKSPACE_ID,
        joinedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
      };

      setData((current) => ({
        ...current,
        members: [member, ...current.members],
        activities: [
          makeActivity("MEMBER_ADDED", `Added ${member.name} to the team`, member.id),
          ...current.activities,
        ],
      }));
    },
    []
  );

  const updateMember = useCallback(
    (id: string, input: Partial<Omit<TeamMember, "id" | "workspaceId">>) => {
      setData((current) => {
        const existing = current.members.find((item) => item.id === id);
        if (!existing) return current;

        const updated = { ...existing, ...input };

        return {
          ...current,
          members: current.members.map((item) =>
            item.id === id ? updated : item
          ),
          activities: [
            makeActivity("MEMBER_UPDATED", `Updated ${updated.name}`, id),
            ...current.activities,
          ],
        };
      });
    },
    []
  );

  const deleteMember = useCallback((id: string) => {
    setData((current) => {
      const member = current.members.find((item) => item.id === id);
      if (!member || member.role === "Admin") return current;

      const fallbackAdmin = current.members.find(
        (item) => item.role === "Admin" && item.id !== id
      );

      return {
        ...current,
        members: current.members.filter((item) => item.id !== id),
        projects: current.projects.map((project) => ({
          ...project,
          memberIds: project.memberIds.filter((memberId) => memberId !== id),
          ownerId:
            project.ownerId === id
              ? fallbackAdmin?.id ?? ""
              : project.ownerId,
        })),
        tasks: current.tasks.map((task) => ({
          ...task,
          assigneeId: task.assigneeId === id ? null : task.assigneeId,
        })),
        activities: [
          makeActivity("MEMBER_REMOVED", `Removed ${member.name} from the team`, id),
          ...current.activities,
        ],
      };
    });
  }, []);

  const assignMemberToProject = useCallback(
    (projectId: string, memberId: string) => {
      setData((current) => {
        const memberExists = current.members.some((item) => item.id === memberId);
        if (!memberExists) return current;

        return {
          ...current,
          projects: current.projects.map((project) =>
            project.id === projectId && !project.memberIds.includes(memberId)
              ? { ...project, memberIds: [...project.memberIds, memberId] }
              : project
          ),
        };
      });
    },
    []
  );

  const removeMemberFromProject = useCallback(
    (projectId: string, memberId: string) => {
      setData((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === projectId
            ? {
                ...project,
                memberIds: project.memberIds.filter((id) => id !== memberId),
                ownerId: project.ownerId === memberId ? "" : project.ownerId,
              }
            : project
        ),
        tasks: current.tasks.map((task) =>
          task.projectId === projectId && task.assigneeId === memberId
            ? { ...task, assigneeId: null }
            : task
        ),
      }));
    },
    []
  );

  const getProjectProgress = useCallback(
    (projectId: string) => {
      const projectTasks = data.tasks.filter(
        (task) => task.projectId === projectId
      );

      if (projectTasks.length === 0) return 0;

      return Math.round(
        (projectTasks.filter((task) => task.status === "Done").length /
          projectTasks.length) *
          100
      );
    },
    [data.tasks]
  );

  const getProjectTasks = useCallback(
    (projectId: string) =>
      data.tasks.filter((task) => task.projectId === projectId),
    [data.tasks]
  );

  const getProjectMembers = useCallback(
    (projectId: string) => {
      const project = data.projects.find((item) => item.id === projectId);
      if (!project) return [];

      return data.members.filter((member) =>
        project.memberIds.includes(member.id)
      );
    },
    [data.projects, data.members]
  );

  const getMemberProjects = useCallback(
    (memberId: string) =>
      data.projects.filter((project) => project.memberIds.includes(memberId)),
    [data.projects]
  );

  const value = useMemo(
    () => ({
      ...data,
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      deleteTask,
      createMember,
      updateMember,
      deleteMember,
      assignMemberToProject,
      removeMemberFromProject,
      getProjectProgress,
      getProjectTasks,
      getProjectMembers,
      getMemberProjects,
    }),
    [
      data,
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      deleteTask,
      createMember,
      updateMember,
      deleteMember,
      assignMemberToProject,
      removeMemberFromProject,
      getProjectProgress,
      getProjectTasks,
      getProjectMembers,
      getMemberProjects,
    ]
  );

 return (
  <WorkspaceContext.Provider value={value}>
    {children}
  </WorkspaceContext.Provider>
);
}