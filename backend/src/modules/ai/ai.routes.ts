
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  chat,
  getMessages,
  listWorkspaceConversations,
} from "./ai.controller.js";

const router = Router();

router.use(authenticate);

router.post("/chat", chat);

// Conversations
router.get(
  "/workspaces/:workspaceId/conversations",
  listWorkspaceConversations
);

router.get("/conversations/:conversationId/messages", getMessages);

export default router;
