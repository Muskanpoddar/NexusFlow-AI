
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../services/api/apiClient";

import type { Project } from "../types/project";
import type { Task } from "../types/task";
import type {
  MemberRole,
  TeamMember,
  WorkspaceInvitation,
} from "../types/team";
import type { Activity } from "../types/activity";

export interface WorkspaceData {
  projects: Project[];
  tasks: Task[];
  members: TeamMember[];
  activities: Activity[];
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
}

type ProjectInput = Omit<Project, "id" | "createdAt" | "workspaceId">;
type TaskInput = Omit<Task, "id" | "createdAt" | "workspaceId">;

export interface WorkspaceContextValue extends WorkspaceData {
  loading: boolean;
  error: string | null;
  workspaceId: string | null;
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary | null;
  switchWorkspace: (id: string) => void;
  refreshWorkspace: () => Promise<void>;
  createWorkspace: (name: string) => Promise<string>;

  createProject: (data: ProjectInput) => Promise<void>;
  updateProject: (
    id: string,
    data: Partial<Omit<Project, "id" | "workspaceId">>
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  createTask: (data: TaskInput) => Promise<void>;
  updateTask: (
    id: string,
    data: Partial<Omit<Task, "id" | "workspaceId">>
  ) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  updateMember: (
    id: string,
    data: Partial<Omit<TeamMember, "id" | "workspaceId">>
  ) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;

  invitations: WorkspaceInvitation[];
  inviteMember: (
    email: string,
    role: MemberRole
  ) => Promise<{
    email: string;
    role: MemberRole;
    inviteLink: string;
    emailed: boolean;
  }>;
  revokeInvitation: (id: string) => Promise<void>;
  acceptInvitation: (
    token: string
  ) => Promise<{ workspaceId: string; workspaceName: string }>;

  assignMemberToProject: (
    projectId: string,
    memberId: string
  ) => Promise<void>;
  removeMemberFromProject: (
    projectId: string,
    memberId: string
  ) => Promise<void>;

  getProjectProgress: (projectId: string) => number;
  getProjectTasks: (projectId: string) => Task[];
  getProjectMembers: (projectId: string) => TeamMember[];
  getMemberProjects: (memberId: string) => Project[];
}

export const WorkspaceContext =
  createContext<WorkspaceContextValue | null>(null);

const EMPTY_DATA: WorkspaceData = {
  projects: [],
  tasks: [],
  members: [],
  activities: [],
};

const WORKSPACE_STORAGE_KEY = "nexusflow-workspace-id";

type AnyRecord = Record<string, any>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object"
    ? (value as AnyRecord)
    : {};
}

function extractArray(value: unknown, keys: string[]): AnyRecord[] {
  if (Array.isArray(value)) return value;

  const record = asRecord(value);

  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key];
  }

  return [];
}

function dateOnly(value: unknown): string {
  if (!value) return "";

  const date = new Date(String(value));

  return Number.isNaN(date.getTime())
    ? String(value).slice(0, 10)
    : date.toISOString().slice(0, 10);
}

function formatJoinedAt(value: unknown): string {
  if (!value) return "";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function projectStatus(value: unknown): Project["status"] {
  const status = String(value ?? "PLANNING").toUpperCase();

  const map: Record<string, Project["status"]> = {
    PLANNING: "Planning",
    ACTIVE: "Active",
    ON_HOLD: "On Hold",
    COMPLETED: "Completed",
  };

  return map[status] ?? "Planning";
}

function taskStatus(value: unknown): Task["status"] {
  const status = String(value ?? "TODO").toUpperCase();

  const map: Record<string, Task["status"]> = {
    TODO: "To Do",
    TO_DO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
  };

  return map[status] ?? "To Do";
}

function priority(value: unknown): "Low" | "Medium" | "High" | "Urgent" {
  const result = String(value ?? "MEDIUM").toUpperCase();

  if (result === "LOW") return "Low";
  if (result === "URGENT") return "Urgent";
  if (result === "HIGH") return "High";

  return "Medium";
}

function memberRole(value: unknown): MemberRole {
  const role = String(value ?? "MEMBER").toUpperCase();

  if (role === "OWNER" || role === "ADMIN" || role === "MANAGER") return role;

  return "MEMBER";
}

function statusToApi(value: Project["status"] | Task["status"]): string {
  const map: Record<string, string> = {
    Planning: "PLANNING",
    Active: "ACTIVE",
    "On Hold": "ON_HOLD",
    Completed: "COMPLETED",
    "To Do": "TODO",
    "In Progress": "IN_PROGRESS",
    Done: "DONE",
  };

  return map[value] ?? String(value).toUpperCase();
}

function mapProject(raw: AnyRecord, workspaceId: string): Project {
  const projectMembers = extractArray(raw.members ?? raw.projectMembers, [
    "members",
    "projectMembers",
  ]);

  const memberIds = projectMembers
    .map((item) => {
      const record = asRecord(item);
      return String(record.userId ?? record.user?.id ?? record.id ?? "");
    })
    .filter(Boolean);

  return {
    id: String(raw.id),
    workspaceId: String(raw.workspaceId ?? workspaceId),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    status: projectStatus(raw.status),
    priority: priority(raw.priority),
    ownerId: String(
      raw.ownerId ?? raw.createdById ?? raw.createdBy?.id ?? ""
    ),
    memberIds,
    // The current backend Project model does not persist category.
    category: String(raw.category ?? "Other"),
    startDate: dateOnly(raw.startDate),
    dueDate: dateOnly(raw.dueDate),
    createdAt: String(raw.createdAt ?? ""),
  };
}

function mapTask(raw: AnyRecord, workspaceId: string): Task {
  return {
    id: String(raw.id),
    workspaceId: String(raw.workspaceId ?? workspaceId),
    projectId: String(raw.projectId ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    status: taskStatus(raw.status),
    priority: priority(raw.priority),
    assigneeId: raw.assigneeId ? String(raw.assigneeId) : null,
    dueDate: dateOnly(raw.dueDate),
    createdAt: String(raw.createdAt ?? ""),
  };
}

function mapMember(raw: AnyRecord, workspaceId: string): TeamMember {
  const user = asRecord(raw.user);

  return {
    id: String(raw.userId ?? user.id ?? raw.id),
    workspaceId: String(raw.workspaceId ?? workspaceId),
    name: String(user.name ?? raw.name ?? ""),
    email: String(user.email ?? raw.email ?? ""),
    role: memberRole(raw.role),
    joinedAt: formatJoinedAt(raw.joinedAt ?? raw.createdAt),
  };
}

function mapActivity(raw: AnyRecord, workspaceId: string): Activity {
  const actor = asRecord(raw.actor);

  return {
    id: String(raw.id),
    workspaceId: String(raw.workspaceId ?? workspaceId),
    type: raw.type,
    message: String(raw.message ?? raw.description ?? ""),
    actorId: String(raw.actorId ?? raw.userId ?? actor.id ?? ""),
    actorName: String(actor.name ?? raw.actorName ?? ""),
    entityId: String(raw.entityId ?? ""),
    createdAt: String(raw.createdAt ?? ""),
  };
}

export function WorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, token, isAuthenticated, refreshUser } = useAuth();

  const workspaces = useMemo<WorkspaceSummary[]>(
    () =>
      (user?.workspaces ?? []).map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        role: membership.role,
      })),
    [user?.workspaces]
  );

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    () => localStorage.getItem(WORKSPACE_STORAGE_KEY)
  );

  // A stale or unknown selection falls back to the first workspace the user
  // can actually reach.
  const workspaceId =
    workspaces.some((workspace) => workspace.id === selectedWorkspaceId)
      ? selectedWorkspaceId
      : workspaces[0]?.id ?? null;

  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === workspaceId) ?? null;

  const switchWorkspace = useCallback((id: string) => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
    setSelectedWorkspaceId(id);
  }, []);

  const [data, setData] = useState<WorkspaceData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    <T,>(path: string, options: {
      method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
      body?: unknown;
    } = {}) => {
      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      return apiRequest<T>(path, {
        ...options,
        token,
      });
    },
    [token]
  );

  const refreshWorkspace = useCallback(async () => {
    if (!isAuthenticated || !token || !workspaceId) {
      setData(EMPTY_DATA);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [projectsResponse, membersResponse, activitiesResponse] =
        await Promise.all([
          request<unknown>(
            `/api/projects/workspaces/${workspaceId}`
          ),
          request<unknown>(
            `/api/workspaces/${workspaceId}/members`
          ),
          request<unknown>(
            `/api/activities/workspaces/${workspaceId}?page=1&limit=50`
          ),
        ]);

      const rawProjects = extractArray(projectsResponse, ["projects"]);
      const rawMembers = extractArray(membersResponse, ["members"]);
      const rawActivities = extractArray(activitiesResponse, [
        "activities",
      ]);

      const projects = rawProjects.map((item) =>
        mapProject(item, workspaceId)
      );

      const members = rawMembers.map((item) =>
        mapMember(item, workspaceId)
      );

      const tasksByProject = await Promise.all(
        projects.map(async (project) => {
          const response = await request<unknown>(
            `/api/tasks/workspaces/${workspaceId}/projects/${project.id}`
          );

          return extractArray(response, ["tasks"]).map((item) =>
            mapTask(item, workspaceId)
          );
        })
      );

      setData({
        projects,
        members,
        tasks: tasksByProject.flat(),
        activities: rawActivities.map((item) =>
          mapActivity(item, workspaceId)
        ),
      });
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Unable to load workspace data.";

      setError(message);
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, workspaceId, request]);

  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);

  const refreshInvitations = useCallback(async () => {
    if (!token || !workspaceId) {
      setInvitations([]);
      return;
    }

    try {
      const response = await request<unknown>(
        `/api/workspaces/${workspaceId}/invitations`
      );

      setInvitations(
        extractArray(response, ["invitations"]).map((item) => ({
          id: String(item.id),
          email: String(item.email ?? ""),
          role: memberRole(item.role),
          expiresAt: String(item.expiresAt ?? ""),
          createdAt: String(item.createdAt ?? ""),
        }))
      );
    } catch {
      // Only owners and admins are allowed to list the invitations.
      setInvitations([]);
    }
  }, [token, workspaceId, request]);

  useEffect(() => {
    void refreshWorkspace();
    void refreshInvitations();
  }, [refreshWorkspace, refreshInvitations]);

  const createWorkspace = useCallback(
    async (name: string) => {
      const created = await request<AnyRecord>("/api/workspaces", {
        method: "POST",
        body: { name },
      });

      const createdId = String(created.id ?? "");

      // The workspace list belongs to the user, so it has to be reloaded
      // before the new workspace can be selected.
      await refreshUser();
      switchWorkspace(createdId);

      return createdId;
    },
    [request, refreshUser, switchWorkspace]
  );

  const createProject = useCallback(
    async (input: ProjectInput) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      const created = await request<unknown>(
        `/api/projects/workspaces/${workspaceId}`,
        {
          method: "POST",
          body: {
            name: input.name,
            description: input.description,
            status: statusToApi(input.status),
            priority: input.priority.toUpperCase(),
            startDate: input.startDate || null,
            dueDate: input.dueDate || null,
          },
        }
      );

      const record = asRecord(created);
      const project = asRecord(record.project ?? created);
      const projectId = project.id ? String(project.id) : null;

      if (projectId) {
        for (const memberId of input.memberIds) {
          // The backend makes the creator the owner and already adds them as
          // a member, so only the remaining members are attached here.
          if (memberId === user?.id) continue;

          await request(
            `/api/projects/workspaces/${workspaceId}/${projectId}/members`,
            {
              method: "POST",
              body: { userId: memberId },
            }
          );
        }
      }

      await refreshWorkspace();
    },
    [workspaceId, user?.id, request, refreshWorkspace]
  );

  const updateProject = useCallback(
    async (
      id: string,
      input: Partial<Omit<Project, "id" | "workspaceId">>
    ) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      const body: AnyRecord = {};

      if (input.name !== undefined) body.name = input.name;
      if (input.description !== undefined) body.description = input.description;
      if (input.status !== undefined) body.status = statusToApi(input.status);
      if (input.priority !== undefined) body.priority = input.priority.toUpperCase();
      if (input.startDate !== undefined) body.startDate = input.startDate || null;
      if (input.dueDate !== undefined) body.dueDate = input.dueDate || null;

      await request(
        `/api/projects/workspaces/${workspaceId}/${id}`,
        { method: "PATCH", body }
      );

      if (input.memberIds) {
        const current = data.projects.find((project) => project.id === id);
        const previousIds = current?.memberIds ?? [];

        for (const memberId of input.memberIds) {
          if (!previousIds.includes(memberId)) {
            await request(
              `/api/projects/workspaces/${workspaceId}/${id}/members`,
              {
                method: "POST",
                body: { userId: memberId },
              }
            );
          }
        }

        for (const memberId of previousIds) {
          // The owner can never be detached from their own project.
          if (
            !input.memberIds.includes(memberId) &&
            memberId !== current?.ownerId
          ) {
            await request(
              `/api/projects/workspaces/${workspaceId}/${id}/members/${memberId}`,
              { method: "DELETE" }
            );
          }
        }
      }

      await refreshWorkspace();
    },
    [workspaceId, data.projects, request, refreshWorkspace]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      await request(
        `/api/projects/workspaces/${workspaceId}/${id}`,
        { method: "DELETE" }
      );

      await refreshWorkspace();
    },
    [workspaceId, request, refreshWorkspace]
  );

  const createTask = useCallback(
    async (input: TaskInput) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      await request(
        `/api/tasks/workspaces/${workspaceId}/projects/${input.projectId}`,
        {
          method: "POST",
          body: {
            title: input.title,
            description: input.description,
            status: statusToApi(input.status),
            priority: input.priority.toUpperCase(),
            assigneeId: input.assigneeId,
            dueDate: input.dueDate || null,
          },
        }
      );

      await refreshWorkspace();
    },
    [workspaceId, request, refreshWorkspace]
  );

  const updateTask = useCallback(
    async (
      id: string,
      input: Partial<Omit<Task, "id" | "workspaceId">>
    ) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      const existing = data.tasks.find((task) => task.id === id);
      const projectId = input.projectId ?? existing?.projectId;

      if (!projectId) throw new Error("The task's project could not be found.");

      const body: AnyRecord = {};

      if (input.title !== undefined) body.title = input.title;
      if (input.description !== undefined) body.description = input.description;
      if (input.status !== undefined) body.status = statusToApi(input.status);
      if (input.priority !== undefined) body.priority = input.priority.toUpperCase();
      if (input.assigneeId !== undefined) body.assigneeId = input.assigneeId;
      if (input.dueDate !== undefined) body.dueDate = input.dueDate || null;

      await request(
        `/api/tasks/workspaces/${workspaceId}/projects/${projectId}/${id}`,
        { method: "PATCH", body }
      );

      await refreshWorkspace();
    },
    [workspaceId, data.tasks, request, refreshWorkspace]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      const task = data.tasks.find((item) => item.id === id);
      if (!task) return;

      await request(
        `/api/tasks/workspaces/${workspaceId}/projects/${task.projectId}/${id}`,
        { method: "DELETE" }
      );

      await refreshWorkspace();
    },
    [workspaceId, data.tasks, request, refreshWorkspace]
  );

  const updateMember = useCallback(
    async (
      id: string,
      input: Partial<Omit<TeamMember, "id" | "workspaceId">>
    ) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      const current = data.members.find((member) => member.id === id);

      // The backend refuses to change the owner role, so it is never sent.
      if (
        input.role &&
        input.role !== current?.role &&
        current?.role !== "OWNER"
      ) {
        await request(
          `/api/workspaces/${workspaceId}/members/${id}`,
          {
            method: "PATCH",
            body: { role: input.role },
          }
        );
      }

      await refreshWorkspace();
    },
    [workspaceId, data.members, request, refreshWorkspace]
  );

  const deleteMember = useCallback(
    async (id: string) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      await request(
        `/api/workspaces/${workspaceId}/members/${id}`,
        { method: "DELETE" }
      );

      await refreshWorkspace();
    },
    [workspaceId, request, refreshWorkspace]
  );

  const inviteMember = useCallback(
    async (email: string, role: MemberRole) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      const created = await request<AnyRecord>(
        `/api/workspaces/${workspaceId}/invitations`,
        {
          method: "POST",
          body: { email, role },
        }
      );

      await refreshInvitations();

      return {
        email: String(created.email ?? email),
        role: memberRole(created.role),
        inviteLink: String(created.inviteLink ?? ""),
        emailed: Boolean(created.emailed),
      };
    },
    [workspaceId, request, refreshInvitations]
  );

  const revokeInvitation = useCallback(
    async (id: string) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      await request(
        `/api/workspaces/${workspaceId}/invitations/${id}`,
        { method: "DELETE" }
      );

      await refreshInvitations();
    },
    [workspaceId, request, refreshInvitations]
  );

  const acceptInvitation = useCallback(
    async (token: string) => {
      const accepted = await request<AnyRecord>(
        "/api/workspaces/invitations/accept",
        { method: "POST", body: { token } }
      );

      const workspace = asRecord(accepted.workspace);

      // The membership belongs to the user, so the workspace list is reloaded.
      await refreshUser();
      await refreshWorkspace();

      return {
        workspaceId: String(workspace.id ?? ""),
        workspaceName: String(workspace.name ?? ""),
      };
    },
    [request, refreshUser, refreshWorkspace]
  );

  const assignMemberToProject = useCallback(
    async (projectId: string, memberId: string) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      await request(
        `/api/projects/workspaces/${workspaceId}/${projectId}/members`,
        {
          method: "POST",
          body: { userId: memberId },
        }
      );

      await refreshWorkspace();
    },
    [workspaceId, request, refreshWorkspace]
  );

  const removeMemberFromProject = useCallback(
    async (projectId: string, memberId: string) => {
      if (!workspaceId) throw new Error("No workspace is selected.");

      await request(
        `/api/projects/workspaces/${workspaceId}/${projectId}/members/${memberId}`,
        { method: "DELETE" }
      );

      await refreshWorkspace();
    },
    [workspaceId, request, refreshWorkspace]
  );

  const getProjectProgress = useCallback(
    (projectId: string) => {
      const projectTasks = data.tasks.filter(
        (task) => task.projectId === projectId
      );

      if (!projectTasks.length) return 0;

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
      data.projects.filter((project) =>
        project.memberIds.includes(memberId)
      ),
    [data.projects]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ...data,
      loading,
      error,
      workspaceId,
      workspaces,
      currentWorkspace,
      switchWorkspace,
      refreshWorkspace,
      createWorkspace,
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      deleteTask,
      updateMember,
      deleteMember,
      invitations,
      inviteMember,
      revokeInvitation,
      acceptInvitation,
      assignMemberToProject,
      removeMemberFromProject,
      getProjectProgress,
      getProjectTasks,
      getProjectMembers,
      getMemberProjects,
    }),
    [
      data,
      loading,
      error,
      workspaceId,
      workspaces,
      currentWorkspace,
      switchWorkspace,
      refreshWorkspace,
      createWorkspace,
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      deleteTask,
      updateMember,
      deleteMember,
      invitations,
      inviteMember,
      revokeInvitation,
      acceptInvitation,
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
