
import { apiRequest } from "../../services/api/apiClient.ts";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface WorkspaceMembership {
  role: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface AuthProfile extends AuthUser {
  workspaces: WorkspaceMembership[];
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  workspaces: WorkspaceMembership[];
}

const TOKEN_KEY = "nexusflow-auth-token";
const USER_KEY = "nexusflow-auth-user";

export function readStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function formatRole(role: string): string {
  const labels: Record<string, string> = {
    OWNER: "Workspace Owner",
    ADMIN: "Workspace Admin",
    MANAGER: "Manager",
    MEMBER: "Member",
  };

  return labels[role] ?? role;
}

export function storeSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  const data = await apiRequest<{
    user: AuthUser;
    workspace?: AuthProfile["workspaces"][number]["workspace"];
    accessToken: string;
  }>("/api/auth/register", { method: "POST", body: input });

  return {
    user: data.user,
    accessToken: data.accessToken,
    workspaces: data.workspace
      ? [{ role: "OWNER", workspace: data.workspace }]
      : [],
  };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const data = await apiRequest<{
    user: AuthUser;
    workspaces?: AuthProfile["workspaces"];
    accessToken: string;
  }>("/api/auth/login", { method: "POST", body: input });

  return {
    user: data.user,
    accessToken: data.accessToken,
    workspaces: data.workspaces ?? [],
  };
}

export async function fetchCurrentUser(token: string): Promise<AuthProfile> {
  const data = await apiRequest<
    AuthUser & { memberships?: AuthProfile["workspaces"] }
  >("/api/auth/me", { token });

  return { ...data, workspaces: data.memberships ?? [] };
}

export async function updateProfile(
  token: string,
  input: { name: string }
): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/auth/me", {
    method: "PATCH",
    body: input,
    token,
  });
}

export async function changePassword(
  token: string,
  input: { currentPassword: string; newPassword: string }
) {
  await apiRequest("/api/auth/change-password", {
    method: "POST",
    body: input,
    token,
  });
}

export async function requestPasswordReset(email: string) {
  await apiRequest("/api/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}) {
  await apiRequest("/api/auth/reset-password", {
    method: "POST",
    body: input,
  });
}
