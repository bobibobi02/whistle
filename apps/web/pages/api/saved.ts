// pages/api/saved.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = (global as any).prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') (global as any).prisma = prisma;

/**
 * GET  /api/saved
 *   - ?postId=<id>      -> { saved: boolean }
 *   - (no postId)       -> { ids: string[], nextCursor?: string }
 *
 * POST /api/saved
 *   body: { postId: string, action: 'save'|'unsave'|'toggle' }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const userEmail = session?.user?.email || null;
  if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { postId, limit = '50', cursor } = req.query as { postId?: string; limit?: string; cursor?: string };

    // single post status
    if (postId) {
      const exists = await prisma.saved.findUnique({
        where: { Saved_userEmail_postId: { userEmail, postId } },
        select: { id: true },
      });
      return res.json({ saved: !!exists });
    }

    // list ids for this user
    const take = Math.min(Math.max(parseInt(limit || '50', 10), 1), 200);
    const rows = await prisma.saved.findMany({
      where: { userEmail },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: String(cursor) }, skip: 1 } : {}),
      select: { id: true, postId: true },
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return res.json({ ids: items.map(r => r.postId), nextCursor });
  }

  if (req.method === 'POST') {
    const { postId, action } = (req.body ?? {}) as { postId?: string; action?: 'save' | 'unsave' | 'toggle' };
    if (!postId) return res.status(400).json({ error: 'postId required' });

    try {
      if (action === 'save' || action === 'toggle') {
        await prisma.saved.upsert({
          where: { Saved_userEmail_postId: { userEmail, postId } },
          update: {},
          create: { userEmail, postId },
        });
        return res.json({ ok: true, saved: true });
      }

      if (action === 'unsave') {
        await prisma.saved.deleteMany({ where: { userEmail, postId } });
        return res.json({ ok: true, saved: false });
      }

      // default/fallback toggle
      const exists = await prisma.saved.findUnique({
        where: { Saved_userEmail_postId: { userEmail, postId } },
        select: { id: true },
      });
      if (exists) {
        await prisma.saved.delete({ where: { id: exists.id } });
        return res.json({ ok: true, saved: false });
      } else {
        await prisma.saved.create({ data: { userEmail, postId } });
        return res.json({ ok: true, saved: true });
      }
    } catch (e) {
      console.error('saved.ts POST error', e);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
