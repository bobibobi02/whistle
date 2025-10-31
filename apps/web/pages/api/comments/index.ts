// apps/web/pages/api/comments/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prismadb';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions)) as any;

  if (req.method === 'GET') {
    // example: list comments by post
    const postId = String(req.query.postId || '');
    if (!postId) return res.status(400).json({ ok: false, error: 'postId required' });

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        votes: true,
      },
    });
    return res.status(200).json({ ok: true, comments });
  }

  if (req.method === 'POST') {
    const email = session?.user?.email as string | undefined;
    if (!email) return res.status(401).json({ ok: false, error: 'Please log in.' });

    const postId = String(req.body?.postId || '');
    const parentId = req.body?.parentId ? String(req.body.parentId) : null;
    // accept both "content" (old UI) and "body" (DB field)
    const body = String(req.body?.content ?? req.body?.body ?? '').trim();
    if (!postId || !body) return res.status(400).json({ ok: false, error: 'Invalid payload' });

    const comment = await prisma.comment.create({
      data: {
        postId,
        parentId,
        body, // <-- DB field is "body"
        userEmail: email.toLowerCase(),
      },
    });

    return res.status(201).json({ ok: true, comment });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
