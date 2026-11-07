import type { Request, Response } from "express";

import {
  createProjectSchema,
  updateProjectSchema,
  projectMemberSchema,
} from "./project.validation.js";

import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  ProjectError,
} from "./project.service.js";

function getRouteParam(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function handleError(res: Response, error: unknown) {
  if (error instanceof ProjectError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Project error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected project error occurred",
  });
}

export async function listProjects(
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

    const projects = await getProjects(workspaceId, userId);

    return res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getProject(
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

    const project = await getProjectById(
      workspaceId,
      projectId,
      userId
    );

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createProjectHandler(
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

    const validation = createProjectSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid project data",
        errors: validation.error.issues,
      });
    }

    const project = await createProject(
      workspaceId,
      userId,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateProjectHandler(
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

    const validation = updateProjectSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid project update",
        errors: validation.error.issues,
      });
    }

    const project = await updateProject(
      workspaceId,
      projectId,
      userId,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function deleteProjectHandler(
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

    const result = await deleteProject(
      workspaceId,
      projectId,
      userId
    );

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function addProjectMemberHandler(
  req: Request,
  res: Response
) {
  try {
    const actorId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);
    const projectId = getRouteParam(req.params.projectId);

    if (!actorId) {
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

    const validation = projectMemberSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid project member data",
        errors: validation.error.issues,
      });
    }

    const member = await addProjectMember(
      workspaceId,
      projectId,
      actorId,
      validation.data.userId
    );

    return res.status(201).json({
      success: true,
      message: "Project member added successfully",
      data: member,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function removeProjectMemberHandler(
  req: Request,
  res: Response
) {
  try {
    const actorId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);
    const projectId = getRouteParam(req.params.projectId);
    const targetUserId = getRouteParam(req.params.userId);

    if (!actorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!workspaceId || !projectId || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace, project, or user ID",
      });
    }

    const result = await removeProjectMember(
      workspaceId,
      projectId,
      actorId,
      targetUserId
    );

    return res.status(200).json({
      success: true,
      message: "Project member removed successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}