import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";

import {
  listProjects,
  getProject,
  createProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
  addProjectMemberHandler,
  removeProjectMemberHandler,
} from "./project.controller.js";

const router = Router();

router.use(authenticate);

// Project CRUD
router.get("/workspaces/:workspaceId", listProjects);

router.post(
  "/workspaces/:workspaceId",
  createProjectHandler
);

router.get(
  "/workspaces/:workspaceId/:projectId",
  getProject
);

router.patch(
  "/workspaces/:workspaceId/:projectId",
  updateProjectHandler
);

router.delete(
  "/workspaces/:workspaceId/:projectId",
  deleteProjectHandler
);

// Project members
router.post(
  "/workspaces/:workspaceId/:projectId/members",
  addProjectMemberHandler
);

router.delete(
  "/workspaces/:workspaceId/:projectId/members/:userId",
  removeProjectMemberHandler
);

export default router;