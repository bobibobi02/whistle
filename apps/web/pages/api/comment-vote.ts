// apps/web/pages/api/comment-vote.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prismadb';
import { authOptions } from './auth/[...nextauth]'; // adjust the path if different

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const session = (await getServerSession(req, res, authOptions)) as any;
  const email: string | null = session?.user?.email || null;
  if (!email) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const commentId = String(req.body?.commentId || '');
  const value = Number(req.body?.value ?? 0);
  if (!commentId || ![-1, 0, 1].includes(value)) {
    return res.status(400).json({ ok: false, error: 'Invalid payload' });
  }

  try {
    if (value === 0) {
      await prisma.commentVote.deleteMany({ where: { commentId, userEmail: email } });
    } else {
      await prisma.commentVote.upsert({
        where: { commentId_userEmail: { commentId, userEmail: email } },
        update: { value },
        create: { commentId, userEmail: email, value },
      });
    }
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
