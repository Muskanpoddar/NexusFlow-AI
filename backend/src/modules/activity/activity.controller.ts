import type { Request, Response } from "express";
import { z } from "zod";

import {
  getWorkspaceActivities,
  ActivityError,
} from "./activity.service.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function handleError(res: Response, error: unknown) {
  if (error instanceof ActivityError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Activity error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected activity error occurred",
  });
}

export async function listWorkspaceActivities(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;
    const workspaceId = req.params.workspaceId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (typeof workspaceId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID",
      });
    }

    const validation = paginationSchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
        errors: validation.error.issues,
      });
    }

    const result = await getWorkspaceActivities(
      workspaceId,
      userId,
      validation.data.page,
      validation.data.limit
    );

    return res.status(200).json({
      success: true,
      data: result.activities,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleError(res, error);
  }
}