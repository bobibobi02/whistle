// pages/api/posts/[postId].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "../auth/[...nextauth]"; // adjust path if needed

// Reuse Prisma in dev
const prisma = (global as any).prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") (global as any).prisma = prisma;

function effectiveMethod(req: NextApiRequest): string {
  const hdr = (req.headers["x-http-method-override"] as string) || "";
  const q = (req.query._method as string) || "";
  const b = typeof req.body === "object" && req.body ? (req.body as any)?._method : "";
  return (hdr || q || b || req.method || "GET").toUpperCase();
}

function readId(req: NextApiRequest): string | undefined {
  const qp = req.query;
  const routeId = (qp.postId as string) || (Array.isArray(qp.postId) ? qp.postId[0] : undefined);
  const queryId = (qp.id as string) || (Array.isArray(qp.id) ? qp.id[0] : "");
  const bodyId = typeof req.body === "object" && req.body ? (req.body as any).id || (req.body as any).postId : "";
  const id = (routeId || queryId || bodyId || "").toString().trim();
  return id || undefined;
}

// Compute vote score for a post
async function getScore(postId: string) {
  const agg = await prisma.vote.aggregate({ where: { postId }, _sum: { value: true } });
  return (agg._sum.value ?? 0) as number;
}

// Compute comment count for a post
async function getCommentsCount(postId: string) {
  return prisma.comment.count({ where: { postId } });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = effectiveMethod(req);

  try {
    if (method === "GET") {
      const id = readId(req);
      if (!id) return res.status(400).json({ error: "Missing id" });

      const item = await prisma.post.findUnique({ where: { id } });
      if (!item) return res.status(404).json({ error: "Not found" });

      const [score, comments] = await Promise.all([getScore(id), getCommentsCount(id)]);
      const enriched = { ...item, score, likesCount: score, commentsCount: comments, _count: { comments } };
      return res.status(200).json({ item: enriched });
    }

    if (method === "DELETE") {
      const id = readId(req);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Missing id",
          hint: "Use DELETE /api/posts/<id>, or provide ?id=<id>, or body { id: <id> }.",
        });
      }

      const session = await getServerSession(req, res, authOptions as any);
      if (!session?.user?.email) return res.status(401).json({ ok: false, error: "Unauthorized" });

      // Post has no `user` relation in this project. Ownership via userEmail.
      const post = await prisma.post.findUnique({ where: { id }, select: { id: true, userEmail: true } });
      if (!post) return res.status(404).json({ ok: false, error: "Not found" });
      if (!post.userEmail || post.userEmail !== session.user.email) {
        return res.status(403).json({ ok: false, error: "Forbidden" });
      }

      try {
        await prisma.comment.deleteMany({ where: { postId: id } });
      } catch {}

      await prisma.post.delete({ where: { id } });
      return res.status(200).json({ ok: true, id });
    }

    res.setHeader("Allow", "GET, DELETE");
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (e: any) {
    console.error("API /posts/[postId] error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
