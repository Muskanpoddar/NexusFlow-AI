
export type ProjectStatus = "Planning" | "Active" | "On Hold" | "Completed";
export type ProjectPriority = "Low" | "Medium" | "High" | "Urgent";

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  ownerId: string;
  memberIds: string[];
  category: string;
  startDate: string;
  dueDate: string;
  createdAt: string;
}
