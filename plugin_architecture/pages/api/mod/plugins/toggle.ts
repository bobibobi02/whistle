import type { NextApiRequest, NextApiResponse } from 'next';
import { togglePlugin } from '@/lib/plugins/manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { key, enabled } = req.body;
  const plugin = await togglePlugin(key, enabled);
  res.json(plugin);
}
