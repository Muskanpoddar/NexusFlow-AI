
export type MemberRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";

export interface TeamMember {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
}
