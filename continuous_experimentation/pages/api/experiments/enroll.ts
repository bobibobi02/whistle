import type { NextApiRequest, NextApiResponse } from 'next';
import { enrollUser } from '@/lib/experiments/manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { experimentKey } = req.body;
  const userId = req.query.userId as string;
  if (!experimentKey || !userId) return res.status(400).json({ error: 'Missing params' });
  const variant = await enrollUser(experimentKey, userId);
  res.json({ variant });
}
