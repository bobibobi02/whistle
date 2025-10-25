// apps/web/pages/api/debug/db.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

function detectProvider(url?: string | null) {
  if (!url) return "unknown";
  const u = url.toLowerCase();
  if (u.startsWith("file:")) return "sqlite";
  if (u.startsWith("postgres://") || u.startsWith("postgresql://")) return "postgres";
  if (u.startsWith("mysql://") || u.startsWith("mysqls://")) return "mysql";
  if (u.startsWith("mongodb://") || u.startsWith("mongodb+srv://")) return "mongodb";
  return "other";
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    // Your original counts (unchanged)
    const usersP = prisma.user.count();
    const postsP = prisma.post.count();
    const commentsP = prisma.comment.count().catch(() => 0);

    // Optional models (existence-safe)
    const any = prisma as any;
    const votesP = any.vote?.count?.().catch?.(() => 0) ?? Promise.resolve(0);
    const savesP = any.save?.count?.().catch?.(() => 0) ?? Promise.resolve(0);
    const commentVotesP = any.commentVote?.count?.().catch?.(() => 0) ?? Promise.resolve(0);

    // DB facts (best-effort; won’t fail the endpoint)
    const provider = detectProvider(process.env.DATABASE_URL);
    const sqliteVersionP =
      provider === "sqlite"
        ? prisma.$queryRawUnsafe<{ "sqlite_version()": string }[]>("select sqlite_version()").catch(() => null)
        : Promise.resolve(null);
    const pgVersionP =
      provider === "postgres"
        ? prisma.$queryRawUnsafe<{ version: string }[]>("select version()").catch(() => null)
        : Promise.resolve(null);

    // A tiny sample to prove rows exist (id only, safe)
    const firstPostP = prisma.post
      .findFirst({ select: { id: true, createdAt: true } })
      .catch(() => null);

    const [
      users, posts, comments, votes, saves, commentVotes,
      sqliteVersion, pgVersion, firstPost,
    ] = await Promise.all([
      usersP, postsP, commentsP, votesP, savesP, commentVotesP,
      sqliteVersionP, pgVersionP, firstPostP,
    ]);

    res.status(200).json({
      provider,
      DATABASE_URL: process.env.DATABASE_URL,
      sqlite_path: provider === "sqlite" ? process.env.DATABASE_URL?.replace(/^file:/i, "") : null,
      versions: {
        sqlite: sqliteVersion?.[0]?.["sqlite_version()"] ?? null,
        postgres: pgVersion?.[0]?.version ?? null,
        node: process.version,
      },
      counts: { users, posts, comments, votes, saves, commentVotes },
      sample: { firstPost },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "debug failed" });
  }
}
