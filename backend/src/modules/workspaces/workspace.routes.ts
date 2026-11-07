import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";

import {
  listWorkspaces,
  createWorkspaceHandler,
  listWorkspaceMembers,
  addWorkspaceMemberHandler,
  updateWorkspaceMemberHandler,
  removeWorkspaceMemberHandler,
  createWorkspaceInvitationHandler,
  listWorkspaceInvitationsHandler,
  revokeWorkspaceInvitationHandler,
  acceptWorkspaceInvitationHandler,
} from "./workspace.controller.js";

const router = Router();

router.use(authenticate);

// Workspace routes
router.get("/", listWorkspaces);
router.post("/", createWorkspaceHandler);

// Invitation routes, before the parameterised ones
router.post("/invitations/accept", acceptWorkspaceInvitationHandler);

// Workspace invitation routes
router.get("/:workspaceId/invitations", listWorkspaceInvitationsHandler);

router.post(
  "/:workspaceId/invitations",
  createWorkspaceInvitationHandler
);

router.delete(
  "/:workspaceId/invitations/:invitationId",
  revokeWorkspaceInvitationHandler
);

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