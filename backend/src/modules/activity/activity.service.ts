import { prisma } from "../../lib/prisma.js";

export class ActivityError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ActivityError";
  }
}

export async function createActivity(data: {
  workspaceId: string;
  actorId?: string | null;
  type: string;
  entityType: string;
  entityId: string;
  description: string;
}) {
  return prisma.activity.create({
    data: {
      workspaceId: data.workspaceId,
      actorId: data.actorId ?? null,
      type: data.type,
      entityType: data.entityType,
      entityId: data.entityId,
      description: data.description,
    },
  });
}

export async function getWorkspaceActivities(
  workspaceId: string,
  userId: string,
  page = 1,
  limit = 20
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new ActivityError(
      "You do not have access to this workspace",
      403
    );
  }

  const skip = (page - 1) * limit;

  const [activities, total] = await prisma.$transaction([
    prisma.activity.findMany({
      where: { workspaceId },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activity.count({
      where: { workspaceId },
    }),
  ]);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}