import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from "./auth.validation.js";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }

  return secret;
}

const JWT_SECRET = getJwtSecret();

const ACCESS_TOKEN_EXPIRY = "15m";

const RESET_TOKEN_TTL_MINUTES = Number(
  process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30
);

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Sends the reset link through the Resend HTTP API. Returns false when no
// mailer is configured so the caller can fall back to the server log.
async function sendResetEmail(to: string, link: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) return false;

  try {
    const response = await fetch(
      process.env.RESEND_API_URL ?? "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from:
            process.env.RESEND_FROM ??
            "NexusFlow <onboarding@resend.dev>",
          to: [to],
          subject: "Reset your NexusFlow password",
          html: `<p>Use the link below to choose a new NexusFlow password.</p><p><a href="${link}">Reset my password</a></p><p>The link works once and expires in ${RESET_TOKEN_TTL_MINUTES} minutes.</p>`,
        }),
      }
    );

    if (!response.ok) {
      console.error("Password reset email failed:", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Password reset email failed:", error);
    return false;
  }
}

function createAccessToken(user: { id: string; email: string }) {
  return jwt.sign(
    {
      email: user.email,
    },
    JWT_SECRET,
    {
      subject: user.id,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );
}

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const slug = `workspace-${randomUUID()}`;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const workspace = await tx.workspace.create({
      data: {
        name: `${input.name}'s Workspace`,
        slug,
        createdById: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });

    return { user, workspace };
  });

  return {
    ...result,
    accessToken: createAccessToken(result.user),
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}

export async function loginUser(input: LoginInput) {
  const email = input.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    workspaces: memberships,
    accessToken: createAccessToken(user),
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
) {
  return prisma.user.update({
    where: { id: userId },
    data: { name: input.name },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const passwordMatches = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("INVALID_CURRENT_PASSWORD");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // A password change invalidates every outstanding reset link.
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  return { changed: true };
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  const email = input.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  // The caller always gets the same answer so the endpoint cannot be used to
  // find out which addresses are registered.
  if (!user) {
    return { sent: true };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000
  );

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt,
      },
    }),
  ]);

  const frontendUrl = (
    process.env.FRONTEND_URL ?? "http://localhost:5173"
  ).replace(/\/$/, "");

  const link = `${frontendUrl}/?resetToken=${token}`;

  if (!(await sendResetEmail(user.email, link))) {
    // shortcut: no mailer is configured, so the link goes to the server log.
    // Swap this for an email provider before going to production.
    console.log(`[auth] Password reset link for ${user.email}: ${link}`);
  }

  return { sent: true };
}

export async function resetPassword(input: ResetPasswordInput) {
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(input.token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    throw new Error("INVALID_RESET_TOKEN");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: token.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { reset: true };
}
