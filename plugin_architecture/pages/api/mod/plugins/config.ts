import type { NextApiRequest, NextApiResponse } from 'next';
import { updatePluginConfig } from '@/lib/plugins/manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { key, config } = req.body;
  const plugin = await updatePluginConfig(key, config);
  res.json(plugin);
}
