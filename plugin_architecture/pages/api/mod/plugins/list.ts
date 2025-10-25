import type { NextApiRequest, NextApiResponse } from 'next';
import { listPlugins } from '@/lib/plugins/manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const plugins = await listPlugins();
  res.json(plugins);
}
