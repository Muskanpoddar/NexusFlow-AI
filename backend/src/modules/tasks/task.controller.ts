import type { Request, Response } from "express";

import {
  createTaskSchema,
  updateTaskSchema,
} from "./task.validation.js";

import {
  getProjectTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  TaskError,
} from "./task.service.js";

function getRouteParam(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function handleError(res: Response, error: unknown) {
  if (error instanceof TaskError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Task error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected task error occurred",
  });
}

export async function listProjectTasks(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);
    const projectId = getRouteParam(req.params.projectId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!workspaceId || !projectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace or project ID",
      });
    }

    const tasks = await getProjectTasks(
      workspaceId,
      projectId,
      userId
    );

    return res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getTask(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);
    const projectId = getRouteParam(req.params.projectId);
    const taskId = getRouteParam(req.params.taskId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!workspaceId || !projectId || !taskId) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace, project, or task ID",
      });
    }

    const task = await getTaskById(
      workspaceId,
      projectId,
      taskId,
      userId
    );

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createTaskHandler(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);
    const projectId = getRouteParam(req.params.projectId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!workspaceId || !projectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace or project ID",
      });
    }

    const validation = createTaskSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid task data",
        errors: validation.error.issues,
      });
    }

    const task = await createTask(
      workspaceId,
      projectId,
      userId,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: task,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateTaskHandler(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);
    const projectId = getRouteParam(req.params.projectId);
    const taskId = getRouteParam(req.params.taskId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!workspaceId || !projectId || !taskId) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace, project, or task ID",
      });
    }

    const validation = updateTaskSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid task update",
        errors: validation.error.issues,
      });
    }

    const task = await updateTask(
      workspaceId,
      projectId,
      taskId,
      userId,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function deleteTaskHandler(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);
    const projectId = getRouteParam(req.params.projectId);
    const taskId = getRouteParam(req.params.taskId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!workspaceId || !projectId || !taskId) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace, project, or task ID",
      });
    }

    const result = await deleteTask(
      workspaceId,
      projectId,
      taskId,
      userId
    );

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}