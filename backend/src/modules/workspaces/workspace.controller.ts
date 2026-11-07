import type { Request, Response } from "express";
import {
  createWorkspaceSchema,
  addWorkspaceMemberSchema,
  updateWorkspaceMemberSchema,
  createWorkspaceInvitationSchema,
  acceptWorkspaceInvitationSchema,
} from "./workspace.validation.js";

import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  createWorkspaceInvitation,
  listWorkspaceInvitations,
  revokeWorkspaceInvitation,
  acceptWorkspaceInvitation,
  WorkspaceError,
} from "./workspace.service.js";

function getRouteParam(value: unknown): string | null {
  return typeof value === "string" ? value : null;
} 
function handleError(res: Response, error: unknown) {
  if (error instanceof WorkspaceError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Workspace error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected workspace error occurred",
  });
}

export async function listWorkspaces(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const workspaces = await getUserWorkspaces(userId);

    return res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createWorkspaceHandler(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const validation = createWorkspaceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace data",
        errors: validation.error.issues,
      });
    }

    const workspace = await createWorkspace(
      userId,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      data: workspace,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listWorkspaceMembers(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;
   const workspaceId = getRouteParam(req.params.workspaceId);

if (!workspaceId) {
  return res.status(400).json({
    success: false,
    message: "Invalid workspace ID",
  });
}

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const members = await getWorkspaceMembers(
      workspaceId,
      userId
    );

    return res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function addWorkspaceMemberHandler(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;
   const workspaceId = getRouteParam(req.params.workspaceId);

if (!workspaceId) {
  return res.status(400).json({
    success: false,
    message: "Invalid workspace ID",
  });
}

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const validation = addWorkspaceMemberSchema.safeParse(
      req.body
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid member data",
        errors: validation.error.issues,
      });
    }

    const member = await addWorkspaceMember(
      workspaceId,
      userId,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Member added successfully",
      data: member,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateWorkspaceMemberHandler(
  req: Request,
  res: Response
) {
  try {
    const actorId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);
    const targetUserId = getRouteParam(req.params.userId);

    if (!actorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!workspaceId || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace or user ID",
      });
    }

    const validation = updateWorkspaceMemberSchema.safeParse(
      req.body
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid role data",
        errors: validation.error.issues,
      });
    }

    const member = await updateWorkspaceMemberRole(
      workspaceId,
      targetUserId,
      actorId,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      data: member,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function removeWorkspaceMemberHandler(
  req: Request,
  res: Response
) {
  try {
    const actorId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);

if (!workspaceId) {
  return res.status(400).json({
    success: false,
    message: "Invalid workspace ID",
  });
}
    const targetUserId = getRouteParam(req.params.userId);

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (!actorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await removeWorkspaceMember(
      workspaceId,
      targetUserId,
      actorId
    );

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createWorkspaceInvitationHandler(
  req: Request,
  res: Response
) {
  try {
    const actorId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);

    if (!actorId) {
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

    const validation = createWorkspaceInvitationSchema.safeParse(
      req.body
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation data",
        errors: validation.error.issues,
      });
    }

    const invitation = await createWorkspaceInvitation(
      workspaceId,
      actorId,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: invitation,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listWorkspaceInvitationsHandler(
  req: Request,
  res: Response
) {
  try {
    const actorId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);

    if (!actorId) {
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

    const invitations = await listWorkspaceInvitations(
      workspaceId,
      actorId
    );

    return res.status(200).json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function revokeWorkspaceInvitationHandler(
  req: Request,
  res: Response
) {
  try {
    const actorId = req.auth?.userId;
    const workspaceId = getRouteParam(req.params.workspaceId);
    const invitationId = getRouteParam(req.params.invitationId);

    if (!actorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!workspaceId || !invitationId) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace or invitation ID",
      });
    }

    const result = await revokeWorkspaceInvitation(
      workspaceId,
      invitationId,
      actorId
    );

    return res.status(200).json({
      success: true,
      message: "Invitation revoked successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function acceptWorkspaceInvitationHandler(
  req: Request,
  res: Response
) {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const validation = acceptWorkspaceInvitationSchema.safeParse(
      req.body
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation token",
        errors: validation.error.issues,
      });
    }

    const result = await acceptWorkspaceInvitation(
      validation.data.token,
      userId
    );

    return res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}