
export type ActivityType =
  | "WORKSPACE_CREATED"
  | "WORKSPACE_MEMBER_ADDED"
  | "WORKSPACE_MEMBER_ROLE_UPDATED"
  | "WORKSPACE_MEMBER_REMOVED"
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_DELETED"
  | "PROJECT_MEMBER_ADDED"
  | "PROJECT_MEMBER_REMOVED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_COMPLETED"
  | "TASK_DELETED"
  | "MEMBER_ADDED"
  | "MEMBER_UPDATED"
  | "MEMBER_REMOVED";

export interface Activity {
  id: string;
  workspaceId: string;
  type: ActivityType;
  message: string;
  actorId: string;
  actorName: string;
  entityId: string;
  createdAt: string;
}
