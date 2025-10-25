import type { NextApiRequest, NextApiResponse } from 'next';
import { getResults } from '@/lib/experiments/manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const experimentKey = req.query.experimentKey as string;
  if (!experimentKey) return res.status(400).json({ error: 'Missing experimentKey' });
  const results = await getResults(experimentKey);
  res.json({ results });
}
