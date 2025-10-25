// pages/api/subforum/[name].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = (global as any).prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') (global as any).prisma = prisma;

type CursorPop = { s: number; t: string; i: string }; // score, createdAt ISO, id

function encodeCursor(c: CursorPop | null): string | null {
  if (!c) return null;
  try { return Buffer.from(JSON.stringify(c)).toString('base64'); } catch { return null; }
}
function decodeCursor(raw?: string | null): CursorPop | null {
  if (!raw) return null;
  try { return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); } catch { return null; }
}

function parseWindow(q?: string): Date {
  const now = Date.now();
  const v = (q || '7d').trim().toLowerCase();
  const m = v.match(/^(\d+)([dhw])$/i);
  let ms = 7 * 24 * 60 * 60 * 1000; // default 7 days
  if (m) {
    const n = parseInt(m[1], 10);
    const u = m[2].toLowerCase();
    if (u === 'h') ms = n * 60 * 60 * 1000;
    if (u === 'd') ms = n * 24 * 60 * 60 * 1000;
    if (u === 'w') ms = n * 7 * 24 * 60 * 60 * 1000;
  }
  return new Date(now - ms);
}

async function getScoresFor(ids: string[]) {
  if (!ids.length) return {} as Record<string, number>;
  const grouped = await prisma.vote.groupBy({
    by: ['postId'],
    where: { postId: { in: ids } },
    _sum: { value: true },
  });
  const map: Record<string, number> = {};
  for (const g of grouped) map[g.postId] = (g._sum.value ?? 0) as number;
  for (const id of ids) if (!(id in map)) map[id] = 0;
  return map;
}

async function getCommentCountsFor(ids: string[]) {
  if (!ids.length) return {} as Record<string, number>;
  const grouped = await prisma.comment.groupBy({
    by: ['postId'],
    where: { postId: { in: ids } },
    _count: { _all: true },
  });
  const map: Record<string, number> = {};
  for (const g of grouped) map[g.postId] = g._count._all;
  for (const id of ids) if (!(id in map)) map[id] = 0;
  return map;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const name = String(req.query.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Missing subforum name' });

    // Ensure subforum exists (nice DX)
    await prisma.subforum.upsert({ where: { name }, update: {}, create: { name } });

    const sort = String(req.query.sort || 'latest').toLowerCase();
    const limitParam = parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 20) : 12;

    // -------- LATEST (cursor = last post id) --------
    if (sort === 'latest') {
      const cursorId = (req.query.cursor as string) || undefined;

      const query: any = {
        where: { subforumName: name },
        orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
        take: limit + 1
      };
      if (cursorId) { query.cursor = { id: cursorId }; query.skip = 1; }

      const rows = await prisma.post.findMany(query);
      const hasMore = rows.length > limit;
      const pageItems = hasMore ? rows.slice(0, limit) : rows;

      const ids = pageItems.map(p => p.id);
      const [scoreMap, commentMap] = await Promise.all([
        getScoresFor(ids),
        getCommentCountsFor(ids),
      ]);

      const enriched = pageItems.map(p => ({
        ...p,
        score: scoreMap[p.id] ?? 0,
        likesCount: scoreMap[p.id] ?? 0,
        commentsCount: commentMap[p.id] ?? 0,
        _count: { comments: commentMap[p.id] ?? 0 },
      }));

      const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;
      return res.status(200).json({ items: enriched, nextCursor });
    }

    // -------- POPULAR (rank by score within time window) --------
    const windowFrom = parseWindow(String(req.query.window ?? '7d'));
    const cursorPop = decodeCursor(String(req.query.cursor || ''));

    const MAX_SCAN = 500;
    const candidates = await prisma.post.findMany({
      where: { subforumName: name, createdAt: { gte: windowFrom } },
      orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
      take: MAX_SCAN,
    });

    const ids = candidates.map(p => p.id);
    const [scoreMap, commentMap] = await Promise.all([
      getScoresFor(ids),
      getCommentCountsFor(ids),
    ]);

    const enrichedAll = candidates.map(p => ({
      ...p,
      score: scoreMap[p.id] ?? 0,
      likesCount: scoreMap[p.id] ?? 0,
      commentsCount: commentMap[p.id] ?? 0,
      _count: { comments: commentMap[p.id] ?? 0 },
    }));

    enrichedAll.sort((a: any, b: any) => {
      const s = (b.score ?? 0) - (a.score ?? 0);
      if (s !== 0) return s;
      const tb = new Date(b.createdAt).getTime();
      const ta = new Date(a.createdAt).getTime();
      if (tb !== ta) return tb - ta;
      return String(b.id).localeCompare(String(a.id));
    });

    // Apply cursor
    let start = 0;
    if (cursorPop) {
      const idx = enrichedAll.findIndex(
        (p) =>
          p.id === cursorPop.i &&
          (p.score ?? 0) === cursorPop.s &&
          new Date(p.createdAt).toISOString() === new Date(cursorPop.t).toISOString()
      );
      if (idx >= 0) start = idx + 1;
      else {
        start = enrichedAll.findIndex((p) => {
          const cmpScore = (p.score ?? 0) < cursorPop.s;
          const tieScore = (p.score ?? 0) === cursorPop.s;
          const pTime = new Date(p.createdAt).getTime();
          const cTime = new Date(cursorPop.t).getTime();
          const cmpTime = tieScore && pTime < cTime;
          const tieTime = tieScore && pTime === cTime;
          const cmpId = tieTime && String(p.id) < String(cursorPop.i);
          return cmpScore || cmpTime || cmpId;
        });
        if (start < 0) start = enrichedAll.length;
      }
    }

    const page = enrichedAll.slice(start, start + limit);
    const last = page[page.length - 1];
    const nextCursor = last
      ? encodeCursor({ s: last.score ?? 0, t: new Date(last.createdAt).toISOString(), i: String(last.id) })
      : null;

    return res.status(200).json({ items: page, nextCursor });
  } catch (e: any) {
    console.error('/api/subforum/[name] error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
