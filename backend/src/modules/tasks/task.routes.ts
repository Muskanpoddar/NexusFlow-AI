import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";

import {
  listProjectTasks,
  getTask,
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
} from "./task.controller.js";

const router = Router();

router.use(authenticate);

// Project tasks
router.get(
  "/workspaces/:workspaceId/projects/:projectId",
  listProjectTasks
);

router.post(
  "/workspaces/:workspaceId/projects/:projectId",
  createTaskHandler
);

// Individual task operations
router.get(
  "/workspaces/:workspaceId/projects/:projectId/:taskId",
  getTask
);

router.patch(
  "/workspaces/:workspaceId/projects/:projectId/:taskId",
  updateTaskHandler
);

router.delete(
  "/workspaces/:workspaceId/projects/:projectId/:taskId",
  deleteTaskHandler
);

export default router;