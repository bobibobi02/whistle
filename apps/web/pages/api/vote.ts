// apps/web/pages/api/vote.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Always send JSON, never empty responses. */
function sendJSON(res: NextApiResponse, code: number, data: any) {
  res.status(code).setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data ?? {}));
}

/** Parse safe JSON body (tolerates empty/invalid). */
function getBody<T = any>(req: NextApiRequest): T {
  if (!req.body) return {} as T;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  return req.body as T;
}

/** Restrict to -1, 0, 1. */
function normalizeValue(raw: any): -1 | 0 | 1 | null {
  const n = Number(raw);
  if (n === 1) return 1;
  if (n === -1) return -1;
  if (n === 0 || Number.isNaN(n)) return 0;
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }

  try {
    // Require session
    const session = await getServerSession(req, res, authOptions as any);
    const email = session?.user?.email;
    if (!email) return sendJSON(res, 401, { error: 'Please log in.' });

    // Validate input
    const body = getBody<{ postId?: string; value?: number }>(req);
    const postId = (body.postId || '').trim();
    const value = normalizeValue(body.value);
    if (!postId) return sendJSON(res, 400, { error: 'postId required' });
    if (value === null) return sendJSON(res, 400, { error: 'value must be -1, 0, or 1' });

    const result = await prisma.$transaction(async (tx) => {
      // Ensure user exists (defensive)
      await tx.user.upsert({
        where: { email },
        update: {},
        create: { email },
      });

      // Ensure post exists (defensive)
      const post = await tx.post.findUnique({ where: { id: postId }, select: { id: true } });
      if (!post) throw new Error('Post not found');

      // Find existing vote (schema likely relates via user.email, not userId)
      const existing = await tx.vote.findFirst({
        where: { postId, user: { email } },
        select: { id: true, value: true },
      });

      if (value === 0) {
        if (existing) await tx.vote.delete({ where: { id: existing.id } });
      } else if (existing) {
        if (existing.value !== value) {
          await tx.vote.update({ where: { id: existing.id }, data: { value } });
        }
      } else {
        await tx.vote.create({
          data: {
            value,
            post: { connect: { id: postId } },
            user: { connect: { email } }, // <- important: connect user by email relation
          },
        });
      }

      // Recompute counts
      const [up, down] = await Promise.all([
        tx.vote.count({ where: { postId, value: 1 } }),
        tx.vote.count({ where: { postId, value: -1 } }),
      ]);

      return { up, down };
    });

    return sendJSON(res, 200, { ok: true, ...result });
  } catch (e: any) {
    const msg = e?.message || 'Unexpected error';
    return sendJSON(res, 500, { error: msg });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
