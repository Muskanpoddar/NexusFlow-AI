import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export const addWorkspaceMemberSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).default("MEMBER"),
});

export const updateWorkspaceMemberSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]),
});

export type CreateWorkspaceInput = z.infer<
  typeof createWorkspaceSchema
>;

export type AddWorkspaceMemberInput = z.infer<
  typeof addWorkspaceMemberSchema
>;

export type UpdateWorkspaceMemberInput = z.infer<
  typeof updateWorkspaceMemberSchema
>;