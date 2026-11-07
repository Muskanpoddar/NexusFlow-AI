import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { listWorkspaceActivities } from "./activity.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/workspaces/:workspaceId",
  listWorkspaceActivities
);

export default router;