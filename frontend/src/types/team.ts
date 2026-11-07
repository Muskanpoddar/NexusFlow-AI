
export type MemberRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";

export interface TeamMember {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
  createdAt: string;
}
