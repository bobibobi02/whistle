// apps/web/pages/api/posts/[postId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prismadb';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const postId = String(req.query.postId || '');
  if (!postId) return res.status(400).json({ ok: false, error: 'postId required' });

  if (req.method === 'GET') {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: true,
        comments: true,
        votes: true,
      },
    });
    if (!post) return res.status(404).json({ ok: false, error: 'Not found' });
    return res.status(200).json({ ok: true, post });
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const session = (await getServerSession(req, res, authOptions)) as any;
    const email = session?.user?.email as string | undefined;
    if (!email) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ ok: false, error: 'Not found' });
    if (!post.userEmail || post.userEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    if (req.method === 'PUT') {
      const title = String(req.body?.title ?? post.title);
      const content = String(req.body?.content ?? post.content ?? '');
      const updated = await prisma.post.update({
        where: { id: postId },
        data: { title, content },
      });
      return res.status(200).json({ ok: true, post: updated });
    } else {
      await prisma.post.delete({ where: { id: postId } });
      return res.status(200).json({ ok: true });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
