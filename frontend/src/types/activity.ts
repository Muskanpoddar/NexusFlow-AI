
export type ActivityType =
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_DELETED"
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
  entityId: string;
  createdAt: string;
}
