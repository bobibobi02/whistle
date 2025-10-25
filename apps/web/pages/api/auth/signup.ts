import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

declare global {
  // keep a single Prisma instance in dev
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}
const prisma = global.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__prisma = prisma;

type ApiUser = {
  id: string;
  name: string | null;
  email: string; // <- always string in API response
};

type ApiError = {
  error: string;
};

function methodNotAllowed(res: NextApiResponse<ApiError>) {
  return res.status(405).json({ error: "Method not allowed" });
}

function badRequest(res: NextApiResponse<ApiError>, message: string) {
  return res.status(400).json({ error: message });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ user: ApiUser } | ApiError>
) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const { name, email, password } = (req.body ?? {}) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const normalizedEmail = (email ?? "").trim().toLowerCase();
    const trimmedName = (name ?? "").trim();

    if (!normalizedEmail) {
      return badRequest(res, "Email is required");
    }
    // very light validation; your NextAuth flow will also enforce constraints
    if (!password || password.length < 6) {
      return badRequest(res, "Password must be at least 6 characters");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // If a user exists with the same email, decide how to handle:
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, password: true },
    });

    let savedId: string;
    let savedName: string | null = null;

    if (existing) {
      // If already registered with a password, block duplicate signups
      if (existing.password) {
        return res.status(409).json({ error: "Email is already registered" });
      }
      // If exists without password (e.g., placeholder record), set password and maybe name
      const updated = await prisma.user.update({
        where: { email: normalizedEmail },
        data: {
          password: passwordHash,
          name: trimmedName || existing.name || null,
        },
        select: { id: true, name: true },
      });
      savedId = updated.id;
      savedName = updated.name;
    } else {
      // Create a fresh user; note: your Prisma schema allows email to be optional,
      // but we always set it here so API response email is guaranteed string.
      const created = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: trimmedName || null,
          password: passwordHash,
        },
        select: { id: true, name: true },
      });
      savedId = created.id;
      savedName = created.name;
    }

    const apiUser: ApiUser = {
      id: savedId,
      name: savedName,
      email: normalizedEmail, // <- guaranteed string
    };

    return res.status(201).json({ user: apiUser });
  } catch (e) {
    console.error("signup error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
