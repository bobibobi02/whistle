// pages/api/comments/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { attachSessionEmail, limitOrThrow } from "@/lib/rateLimit";

const prisma = (global as any).prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") (global as any).prisma = prisma;

function badRequest(res: NextApiResponse, msg: string) {
  return res.status(400).json({ error: msg });
}
function displayNameFromEmail(email?: string | null) {
  if (!email) return "user";
  const base = email.split("@")[0] || "user";
  return base;
}
type BaseComment = {
  id: string;
  content: string;
  postId: string;
  parentId: string | null;
  userId: string | null;
  userEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};
function toEnriched(c: BaseComment) {
  return {
    ...c,
    user: c.userEmail
      ? { id: c.userId, name: displayNameFromEmail(c.userEmail), email: c.userEmail }
      : { id: c.userId, name: "user", email: null as any },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = (req.query.id as string) || (Array.isArray(req.query.id) ? req.query.id[0] : "");
  if (!id) return badRequest(res, "Missing id");

  try {
    if (req.method === "GET") {
      const found = await prisma.comment.findUnique({
        where: { id },
        select: {
          id: true, content: true, postId: true, parentId: true, userId: true,
          userEmail: true, createdAt: true, updatedAt: true,
        },
      });
      if (!found) return res.status(404).json({ error: "Not found" });
      return res.status(200).json({ item: toEnriched(found) });
    }

    if (req.method === "PUT" || req.method === "DELETE") {
      const session = await getServerSession(req, res, authOptions as any);
      const email = session?.user?.email || null;
      attachSessionEmail(req, email);

      if (!email) return res.status(401).json({ ok: false, error: "Unauthorized" });

      // Rate limit: edits+deletes 30 / 10 minutes per user
      if (await limitOrThrow(req, res, { key: "comments:mutate", limit: 30, windowMs: 600_000 })) return;

      const found = await prisma.comment.findUnique({
        where: { id },
        select: { id: true, userEmail: true },
      });
      if (!found) return res.status(404).json({ ok: false, error: "Not found" });
      if (!found.userEmail || found.userEmail !== email) {
        return res.status(403).json({ ok: false, error: "Forbidden" });
      }

      if (req.method === "PUT") {
        const body = typeof req.body === "object" && req.body ? (req.body as any) : {};
        const content = String(body.content ?? "").trim();
        if (!content) return badRequest(res, "Missing content");

        const updated = await prisma.comment.update({
          where: { id },
          data: { content },
          select: {
            id: true, content: true, postId: true, parentId: true, userId: true,
            userEmail: true, createdAt: true, updatedAt: true,
          },
        });

        return res.status(200).json({ ok: true, item: toEnriched(updated) });
      }

      await prisma.comment.delete({ where: { id } });
      return res.status(200).json({ ok: true, id });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (e: any) {
    console.error("API /comments/[id] error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
