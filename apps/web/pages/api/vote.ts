// apps/web/pages/api/vote.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prismadb';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const session = (await getServerSession(req, res, authOptions)) as any;
  const email = session?.user?.email as string | undefined;
  if (!email) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const postId = String(req.body?.postId || '');
  const value = Number(req.body?.value ?? 0); // -1, 0, 1

  if (!postId || ![-1, 0, 1].includes(value)) {
    return res.status(400).json({ ok: false, error: 'Invalid payload' });
  }

  try {
    if (value === 0) {
      await prisma.vote.deleteMany({ where: { postId, userEmail: email.toLowerCase() } });
    } else {
      await prisma.vote.upsert({
        where: { postId_userEmail: { postId, userEmail: email.toLowerCase() } },
        update: { value },
        create: { postId, userEmail: email.toLowerCase(), value },
      });
    }

    // Return simple stats
    const [up, down] = await Promise.all([
      prisma.vote.count({ where: { postId, value: 1 } }),
      prisma.vote.count({ where: { postId, value: -1 } }),
    ]);
    return res.status(200).json({ ok: true, stats: { up, down, score: up - down } });
  } catch {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
