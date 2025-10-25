import type { NextApiRequest, NextApiResponse } from 'next';
import { logResult } from '@/lib/experiments/manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { experimentKey, metric, value } = req.body;
  const userId = req.query.userId as string;
  if (!experimentKey || !metric || value == null || !userId) {
    return res.status(400).json({ error: 'Missing params' });
  }
  const result = await logResult(userId, experimentKey, metric, Number(value));
  res.json({ result });
}
