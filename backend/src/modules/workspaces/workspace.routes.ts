import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";

import {
  listWorkspaces,
  createWorkspaceHandler,
  listWorkspaceMembers,
  addWorkspaceMemberHandler,
  updateWorkspaceMemberHandler,
  removeWorkspaceMemberHandler,
} from "./workspace.controller.js";

const router = Router();

router.use(authenticate);

// Workspace routes
router.get("/", listWorkspaces);
router.post("/", createWorkspaceHandler);

// Workspace member routes
router.get("/:workspaceId/members", listWorkspaceMembers);

router.post(
  "/:workspaceId/members",
  addWorkspaceMemberHandler
);

router.patch(
  "/:workspaceId/members/:userId",
  updateWorkspaceMemberHandler
);

router.delete(
  "/:workspaceId/members/:userId",
  removeWorkspaceMemberHandler
);

export default router;