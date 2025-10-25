import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });

  const { postId } = req.body;

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        savedPosts: {
          disconnect: { id: postId },
        },
      },
    });

    return res.status(200).json({ message: 'Post unsaved' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error unsaving post' });
  }
}
