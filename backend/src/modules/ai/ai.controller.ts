
import type { Request, Response } from "express";

import { chatSchema } from "./ai.validation.js";

import {
  AIError,
  chatWithAssistant,
  getConversationMessages,
  listConversations,
} from "./ai.service.js";

function getRouteParam(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function handleError(res: Response, error: unknown) {
  if (error instanceof AIError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error("AI error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected AI error occurred",
  });
}

export async function chat(req: Request, res: Response) {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const validation = chatSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat request",
        errors: validation.error.issues,
      });
    }

    const answer = await chatWithAssistant({
      userId,
      ...validation.data,
    });

    // The frontend assistant merges these fields straight onto its own answer.
    return res.status(200).json({
      success: true,
      data: answer,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listWorkspaceConversations(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID",
      });
    }

    const conversations = await listConversations(workspaceId, userId);

    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getMessages(req: Request, res: Response) {
  try {
    const userId = req.auth?.userId;
    const conversationId = getRouteParam(req.params.conversationId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const messages = await getConversationMessages(conversationId, userId);

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
