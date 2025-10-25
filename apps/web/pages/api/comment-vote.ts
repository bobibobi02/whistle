// pages/api/comment-vote.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { attachSessionEmail, limitOrThrow } from '@/lib/rateLimit';

const prisma = (global as any).prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') (global as any).prisma = prisma;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const session = await getServerSession(req, res, authOptions as any);
    const email = session?.user?.email || null;
    attachSessionEmail(req, email);
    if (!email) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    // 12 comment likes / 10s per user
    if (await limitOrThrow(req, res, { key: 'vote:comment', limit: 12, windowMs: 10_000 })) return;

    const body = (typeof req.body === 'object' && req.body) ? (req.body as any) : {};
    const commentId = String(body.commentId || '').trim();
    const valueNum = Number(body.value ?? 0); // 1 like, 0 remove

    if (!commentId) return res.status(400).json({ ok: false, error: 'Missing commentId' });
    if (![0, 1].includes(valueNum)) {
      return res.status(400).json({ ok: false, error: 'Invalid value (use 1 or 0)' });
    }

    const exists = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true } });
    if (!exists) return res.status(404).json({ ok: false, error: 'Comment not found' });

    if (valueNum === 0) {
      await prisma.commentVote.deleteMany({ where: { commentId, userEmail: email } });
    } else {
      const doUpsert = async () =>
        prisma.commentVote.upsert({
          where: { commentId_userEmail: { commentId, userEmail: email } },
          update: { value: 1 },
          create: { commentId, userEmail: email, value: 1 },
        });

      try {
        await doUpsert();
      } catch {
        await prisma.$transaction(async (tx) => {
          await tx.commentVote.deleteMany({ where: { commentId, userEmail: email } });
          await tx.commentVote.create({ data: { commentId, userEmail: email, value: 1 } });
        });
      }
    }

    const agg = await prisma.commentVote.aggregate({
      where: { commentId },
      _sum: { value: true },
    });
    const likesCount = (agg._sum.value ?? 0) as number;

    return res.status(200).json({
      ok: true,
      commentId,
      likesCount,
      myVote: valueNum as 0 | 1,
    });
  } catch (e: any) {
    console.error('/api/comment-vote error:', e);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
