
export type MemberRole = "Admin" | "Manager" | "Member";

export interface TeamMember {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: MemberRole;
  department: string;
  joinedAt: string;
}
