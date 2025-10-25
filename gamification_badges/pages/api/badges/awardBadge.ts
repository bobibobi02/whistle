import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, badgeKey } = req.body;
  if (!userId || !badgeKey) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  const badge = await prisma.badge.findUnique({ where: { key: badgeKey } });
  if (!badge) {
    return res.status(404).json({ error: 'Badge not found' });
  }
  const userBadge = await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    update: {},
    create: { userId, badgeId: badge.id }
  });
  res.json(userBadge);
}
